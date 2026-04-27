const prisma = require("../config/prisma");
const { normalizeRole } = require("./role.guard");

const ALLOWED_STATUS_TRANSITIONS = {
  RETURN_INITIATED: ["RETURN_IN_TRANSIT"],
  RETURN_IN_TRANSIT: ["RETURNED_RECEIVED"],
  RETURNED_RECEIVED: ["INSPECTION_DECISION"],
  INSPECTION_DECISION: ["REFUND_PROCESS", "RESTOCKED"],
  REFUND_PROCESS: ["REFUND_REQUESTED"],
  REFUND_REQUESTED: ["REFUNDED"],
  REFUNDED: ["RESTOCKED"],
  RESTOCKED: [],
};

const RETURN_ELIGIBLE_ORDER_STATUSES = new Set(["DELIVERED", "FAILED", "RETURNED"]);

/**
 * Build an application error with HTTP status code.
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error & {statusCode: number}}
 */
const buildError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Check actor role.
 * @param {Object|undefined} actor
 * @returns {string}
 */
const getActorRole = (actor) => normalizeRole(actor?.role);

/**
 * Ensure actor can read target return case.
 * @param {Object} returnCase
 * @param {Object|undefined} actor
 * @returns {void}
 */
const assertCanReadReturnCase = () => {};

/**
 * Build reusable history payload with actor metadata.
 * @param {Object|undefined} actor
 * @param {Object} payload
 * @returns {Object}
 */
const buildHistoryPayload = (actor, payload) => ({
  ...payload,
  actorRole: getActorRole(actor) || null,
  actorId: Number.isInteger(Number(actor?.id)) ? Number(actor.id) : null,
});

/**
 * Create return-case history entry.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {number} returnCaseId
 * @param {Object|undefined} actor
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
const createHistoryEntry = (tx, returnCaseId, actor, payload) => {
  return tx.returnCaseHistory.create({
    data: {
      returnCaseId,
      ...buildHistoryPayload(actor, payload),
    },
  });
};

/**
 * Ensure requested lifecycle transition is valid.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {void}
 */
const validateStatusTransition = (fromStatus, toStatus) => {
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];

  if (!allowed.includes(toStatus)) {
    throw buildError(`Invalid status transition from ${fromStatus} to ${toStatus}.`, 400);
  }
};

/**
 * Validate auto-create order terminal state.
 * @param {string} orderStatus
 * @returns {void}
 */
const validateOrderTerminalState = (orderStatus) => {
  const normalizedStatus = String(orderStatus || "").trim().toUpperCase();

  if (!["FAILED", "RETURNED"].includes(normalizedStatus)) {
    throw buildError("Auto return-case creation is allowed only for FAILED or RETURNED orders.", 400);
  }
};

/**
 * Build validated workflow-aware update payload.
 * @param {Object} currentCase
 * @param {UpdateReturnCasePayload} payload
 * @returns {Object}
 */
const buildWorkflowUpdateData = (currentCase, payload) => {
  const updateData = { ...payload };

  if (payload.returnStatus) {
    validateStatusTransition(currentCase.returnStatus, payload.returnStatus);
  }

  const nextInspectionDecision = payload.inspectionDecision || currentCase.inspectionDecision;
  const nextStatus = payload.returnStatus || currentCase.returnStatus;

  if (payload.restocked === true || nextStatus === "RESTOCKED") {
    if (nextInspectionDecision !== "RESELLABLE") {
      throw buildError("Only RESELLABLE returned orders can be restocked.", 400);
    }
    updateData.restocked = true;
    updateData.returnStatus = "RESTOCKED";
  }

  if (nextStatus === "REFUND_REQUESTED" && currentCase.order?.paymentType === "COD" && !currentCase.adminApprovedForCod) {
    throw buildError("COD refund should be blocked before admin approval.", 400);
  }

  if (payload.adminApprovedForCod != null) {
    updateData.adminApprovedForCod = Boolean(payload.adminApprovedForCod);
  }

  if (nextStatus === "REFUND_REQUESTED") {
    updateData.refundStatus = "REQUESTED";
  }

  if (nextStatus === "REFUNDED") {
    updateData.refundStatus = "REFUNDED";
  }

  return updateData;
};

/**
 * Build Prisma include for rich response shape.
 * @returns {Object}
 */
const returnCaseInclude = () => ({
  order: true,
  history: {
    orderBy: { createdAt: "desc" },
  },
  inventoryAdjustments: true,
  lossRecords: true,
});

/**
 * Apply inventory/loss side effects after update.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {Object} currentCase
 * @param {Object} updatedCase
 * @param {Object|undefined} actor
 * @returns {Promise<void>}
 */
const applyWorkflowSideEffects = async (tx, currentCase, updatedCase, actor) => {
  const order = await tx.order.findUnique({ where: { id: updatedCase.orderId } });

  if (
    updatedCase.returnStatus === "RESTOCKED" &&
    updatedCase.inspectionDecision === "RESELLABLE" &&
    !updatedCase.inventoryAdjustedAt
  ) {
    await tx.inventoryAdjustment.create({
      data: {
        returnCaseId: updatedCase.id,
        orderId: updatedCase.orderId,
        quantity: 1,
        reason: "Returned item marked RESELLABLE and restocked.",
      },
    });

    await tx.returnCase.update({
      where: { id: updatedCase.id },
      data: { inventoryAdjustedAt: new Date() },
    });

    await createHistoryEntry(tx, updatedCase.id, actor, {
      action: "INVENTORY_RESTOCKED",
      note: "Returned order marked RESELLABLE and restocked.",
    });
  }

  if (updatedCase.inspectionDecision === "DAMAGED" && !updatedCase.lossRecordedAt) {
    await tx.lossRecord.create({
      data: {
        returnCaseId: updatedCase.id,
        orderId: updatedCase.orderId,
        quantity: 1,
        reason: "Returned item inspected as DAMAGED.",
        notes: updatedCase.notes || null,
      },
    });

    await tx.returnCase.update({
      where: { id: updatedCase.id },
      data: {
        lossRecordedAt: new Date(),
        restocked: false,
      },
    });

    await createHistoryEntry(tx, updatedCase.id, actor, {
      action: "LOSS_RECORDED",
      note: "Damaged return logged as inventory loss and excluded from restock.",
    });
  }

  if (currentCase.returnStatus !== updatedCase.returnStatus) {
    await createHistoryEntry(tx, updatedCase.id, actor, {
      action: "STATUS_TRANSITION",
      fromStatus: currentCase.returnStatus,
      toStatus: updatedCase.returnStatus,
      note: `Status changed from ${currentCase.returnStatus} to ${updatedCase.returnStatus}.`,
    });
  }

};

/**
 * @property {string} orderId
 * @property {string} reason
 * @property {string|null|undefined} [returnedItems]
 * @property {number|string|null|undefined} [refundAmount]
 * @property {string|null|undefined} [notes]
 */

/**
 * @typedef {Object} UpdateReturnCasePayload
 * @property {string} [reason]
 * @property {"RETURN_INITIATED"|"RETURN_IN_TRANSIT"|"RETURNED_RECEIVED"|"INSPECTION_DECISION"|"REFUND_PROCESS"|"REFUND_REQUESTED"|"REFUNDED"|"RESTOCKED"} [returnStatus]
 * @property {"PENDING"|"DAMAGED"|"RESELLABLE"} [inspectionDecision]
 * @property {"NOT_APPLICABLE"|"REQUESTED"|"REFUNDED"} [refundStatus]
 * @property {number|string|null} [refundAmount]
 * @property {boolean} [restocked]
 * @property {string|null} [notes]
 */

/**
 * Fetch all return cases sorted by newest first.
 * @returns {Promise<Array<Object>>}
 */
const listReturnCases = async (actor) => {
  return prisma.returnCase.findMany({
    orderBy: { createdAt: "desc" },
    include: returnCaseInclude(),
  });
};

/**
 * Fetch one return case by numeric ID.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
const getReturnCaseById = async (id, actor) => {

  const data = await prisma.returnCase.findUnique({
    where: { id },
    include: returnCaseInclude(),
  });

  if (!data) {
    return null;
  }

  assertCanReadReturnCase(data, actor);

  return data;
};

/**
 * Create a new return case with workflow-aware defaults.
 * @param {CreateReturnCasePayload} payload
 * @returns {Promise<Object>}
 */
const createReturnCase = async (payload, actor) => {
  const orderId = Number(payload.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw buildError("orderId is required and must be a positive integer.", 400);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw buildError("Order not found.", 404);
  }

  if (!RETURN_ELIGIBLE_ORDER_STATUSES.has(order.status)) {
    throw buildError("Return can only be created for delivered, failed, or returned orders.", 400);
  }

  const requestedCustomerId = Number(order.createdBy || payload.customerId || actor?.id);

  if (!Number.isInteger(requestedCustomerId) || requestedCustomerId <= 0) {
    throw buildError("customerId is required and must be a positive integer.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.returnCase.upsert({
      where: { orderId },
      update: {
        reason: payload.reason,
        refundAmount: payload.refundAmount,
        notes: payload.notes,
        returnedItems: null,
        orderTerminalStatus: "RETURNED",
      },
      create: {
        orderId,
        customerId: requestedCustomerId,
        reason: payload.reason,
        refundAmount: payload.refundAmount,
        notes: payload.notes,
        returnedItems: null,
        refundStatus: "NOT_APPLICABLE",
        returnStatus: "RETURN_INITIATED",
        orderTerminalStatus: "RETURNED",
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: "RETURNED" },
    });

    await createHistoryEntry(tx, created.id, actor, {
      action: "RETURN_CASE_CREATED",
      toStatus: created.returnStatus,
      note: "Complete order return case created.",
    });

    return tx.returnCase.findUnique({
      where: { id: created.id },
      include: returnCaseInclude(),
    });
  }, { timeout: 20000 });
};

/**
 * Automatically create return case when order reaches terminal failed/returned state.
 * @param {Object} payload
 * @param {Object} actor
 * @returns {Promise<Object>}
 */
const autoCreateReturnCaseFromOrderEvent = async (payload, actor) => {
  validateOrderTerminalState(payload.orderStatus);

  const orderId = Number(payload.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw buildError("orderId is required and must be a positive integer.", 400);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw buildError("Order not found.", 404);
  }

  const customerId = order.createdBy || Number(payload.customerId);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw buildError("customerId is required and must be a positive integer.", 400);
  }

  const existing = await prisma.returnCase.findUnique({
    where: { orderId },
    include: returnCaseInclude(),
  });

  if (existing) {
    return {
      ...existing,
      autoCreated: false,
    };
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.returnCase.create({
      data: {
        orderId,
        customerId,
        reason: payload.reason,
        refundAmount: payload.refundAmount,
        notes: payload.notes,
        refundStatus: "NOT_APPLICABLE",
        returnStatus: "RETURN_INITIATED",
        orderTerminalStatus: String(payload.orderStatus).trim().toUpperCase(),
      },
    });

    await createHistoryEntry(tx, created.id, actor, {
      action: "AUTO_CREATED_FROM_ORDER_STATUS",
      toStatus: created.returnStatus,
      note: `Return case auto-created after order status ${payload.orderStatus}.`,
      metadata: {
        orderStatus: String(payload.orderStatus).trim().toUpperCase(),
      },
    });

    const data = await tx.returnCase.findUnique({
      where: { id: created.id },
      include: returnCaseInclude(),
    });

    return {
      ...data,
      autoCreated: true,
    };
  }, { timeout: 20000 });
};

/**
 * Update an existing return case by ID.
 * @param {number} id
 * @param {UpdateReturnCasePayload} payload
 * @returns {Promise<Object>}
 */
const updateReturnCase = async (id, payload, actor) => {
  const currentCase = await prisma.returnCase.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!currentCase) {
    throw buildError("Return case not found.", 404);
  }

  const updateData = buildWorkflowUpdateData(currentCase, payload);

  return prisma.$transaction(async (tx) => {
    const updatedCase = await tx.returnCase.update({
      where: { id },
      data: updateData,
    });

    await applyWorkflowSideEffects(tx, currentCase, updatedCase, actor);

    return tx.returnCase.findUnique({
      where: { id },
      include: returnCaseInclude(),
    });
  }, { timeout: 20000 });
};

/**
 * Move a return case to a specific lifecycle stage.
 * @param {number} id
 * @param {string} returnStatus
 * @param {UpdateReturnCasePayload} [metadata]
 * @returns {Promise<Object>}
 */
const transitionReturnCaseStatus = async (id, returnStatus, metadata = {}, actor) => {
  return updateReturnCase(id, {
    ...metadata,
    returnStatus,
  }, actor);
};

/**
 * Fetch full history for one return case.
 * @param {number} id
 * @param {Object} actor
 * @returns {Promise<Array<Object>>}
 */
const listReturnCaseHistory = async (id, actor) => {
  const currentCase = await prisma.returnCase.findUnique({
    where: { id },
  });

  if (!currentCase) {
    throw buildError("Return case not found.", 404);
  }

  assertCanReadReturnCase(currentCase, actor);

  return prisma.returnCaseHistory.findMany({
    where: { returnCaseId: id },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * Delete a return case by ID.
 * @param {number} id
 * @returns {Promise<Object>}
 */
const deleteReturnCase = async (id, actor) => {
  assertManagerAccess(actor);

  return prisma.returnCase.delete({
    where: { id },
  });
};

/**
 * Validate multiple order identifiers for return eligibility.
 * @param {string} orderIdentifiers - Comma-separated order IDs or tracking numbers
 * @param {Object} actor
 * @returns {Promise<{success: boolean, errors: string[]}>}
 */
const validateReturnOrders = async (orderIdentifiers, actor) => {
  const identifiers = orderIdentifiers
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (identifiers.length === 0) {
    throw buildError("At least one order identifier is required.", 400);
  }

  const errors = [];
  const validatedOrders = [];

  for (const identifier of identifiers) {
    // Try to find by ID (if numeric) or trackingNumber
    const id = Number(identifier);
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: Number.isInteger(id) ? id : -1 },
          { trackingNumber: identifier },
        ],
      },
      include: { returnCase: true },
    });

    if (!order) {
      errors.push(`Order "${identifier}" not found.`);
      continue;
    }

    if (order.status === "RETURNED") {
      errors.push(`Order ${order.trackingNumber || identifier} has already been returned.`);
      continue;
    }

    if (order.status !== "DELIVERED") {
      errors.push(`Order "${identifier}" cannot be returned. Only delivered orders are eligible.`);
      continue;
    }

    validatedOrders.push(order);
  }

  return {
    success: errors.length === 0,
    errors,
    orders: validatedOrders,
  };
};

module.exports = {
  listReturnCases,
  getReturnCaseById,
  createReturnCase,
  autoCreateReturnCaseFromOrderEvent,
  updateReturnCase,
  transitionReturnCaseStatus,
  listReturnCaseHistory,
  deleteReturnCase,
  validateReturnOrders,
};
