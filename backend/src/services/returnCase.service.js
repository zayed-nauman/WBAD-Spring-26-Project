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

const MANAGER_ROLES = new Set(["ADMIN", "DISPATCHER"]);
const CUSTOMER_ROLE = "CUSTOMER";
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
 * Check if actor can operate as dispatcher/admin.
 * @param {Object|undefined} actor
 * @returns {boolean}
 */
const canManageReturnCases = (actor) => MANAGER_ROLES.has(getActorRole(actor));

/**
 * Ensure actor has manager-level access.
 * @param {Object|undefined} actor
 * @returns {void}
 */
const assertManagerAccess = (actor) => {
  if (!canManageReturnCases(actor)) {
    throw buildError("Only admin or dispatcher can perform this action.", 403);
  }
};

/**
 * Ensure actor can read target return case.
 * @param {Object} returnCase
 * @param {Object|undefined} actor
 * @returns {void}
 */
const assertCanReadReturnCase = (returnCase, actor) => {
  const role = getActorRole(actor);

  if (MANAGER_ROLES.has(role)) return;

  if (role === CUSTOMER_ROLE && returnCase.customerId && Number(actor?.id) === returnCase.customerId) {
    return;
  }

  throw buildError("You are not authorized to access this return case.", 403);
};

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
 * Prevent COD refund flow unless explicitly approved.
 * @param {Object} currentCase
 * @param {Object} updateData
 * @returns {void}
 */
const validateRefundPolicy = (currentCase, updateData) => {
  const nextRefundStatus = updateData.refundStatus;
  const requestsRefund = ["REQUESTED", "REFUNDED"].includes(nextRefundStatus);

  if (
    currentCase.paymentType === "COD" &&
    requestsRefund &&
    !updateData.adminApprovedForCod &&
    !currentCase.adminApprovedForCod
  ) {
    throw buildError("COD return cases require admin approval before refund can be requested.", 400);
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
      throw buildError("Only RESELLABLE items can be restocked.", 400);
    }
    updateData.restocked = true;
    updateData.returnStatus = "RESTOCKED";
  }

  if (nextStatus === "REFUND_REQUESTED") {
    updateData.refundStatus = "REQUESTED";
  }

  if (nextStatus === "REFUNDED") {
    updateData.refundStatus = "REFUNDED";
  }

  validateRefundPolicy(currentCase, updateData);

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

    if (order) {
      const inventory = await tx.inventory.findUnique({ where: { productName: order.items } });

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        await tx.inventory.create({
          data: {
            productName: order.items,
            quantity: 1,
            weightPerUnitKg: order.weightKg || 1,
          },
        });
      }
    }

    await createHistoryEntry(tx, updatedCase.id, actor, {
      action: "INVENTORY_RESTOCKED",
      note: "Inventory increased by 1 for a RESELLABLE returned item.",
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

  if (!currentCase.adminApprovedForCod && updatedCase.adminApprovedForCod) {
    await createHistoryEntry(tx, updatedCase.id, actor, {
      action: "COD_REFUND_APPROVED",
      note: "Admin approval recorded for COD refund eligibility.",
    });
  }
};

/**
 * @typedef {Object} CreateReturnCasePayload
 * @property {string} orderId
 * @property {string} reason
 * @property {"PREPAID"|"COD"} paymentType
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
 * @property {boolean} [adminApprovedForCod]
 * @property {boolean} [restocked]
 * @property {string|null} [notes]
 */

/**
 * Fetch all return cases sorted by newest first.
 * @returns {Promise<Array<Object>>}
 */
const listReturnCases = async (actor) => {
  const role = getActorRole(actor);

  const where = role === CUSTOMER_ROLE ? { customerId: Number(actor?.id) || -1 } : {};

  if (!MANAGER_ROLES.has(role) && role !== CUSTOMER_ROLE) {
    throw buildError("Only admin, dispatcher, or customer can access return cases.", 403);
  }

  return prisma.returnCase.findMany({
    where,
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
 * Create a new return case with workflow-aware refund defaults.
 * PREPAID orders start with refund requested, COD defaults to not applicable.
 * @param {CreateReturnCasePayload} payload
 * @returns {Promise<Object>}
 */
const createReturnCase = async (payload, actor) => {
  const role = getActorRole(actor);

  if (!MANAGER_ROLES.has(role) && role !== CUSTOMER_ROLE) {
    throw buildError("Only admin, dispatcher, or customer can create return cases.", 403);
  }

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

  if (order.paymentType !== payload.paymentType) {
    throw buildError("paymentType must match the linked order payment type.", 400);
  }

  const requestedCustomerId = Number(payload.customerId);

  if (!Number.isInteger(requestedCustomerId) || requestedCustomerId <= 0) {
    throw buildError("customerId is required and must be a positive integer.", 400);
  }

  if (role === CUSTOMER_ROLE && requestedCustomerId !== Number(actor?.id)) {
    throw buildError("Customers can only create return cases for their own account.", 403);
  }

  if (order.createdBy && requestedCustomerId !== order.createdBy) {
    throw buildError("customerId must match the order owner.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.returnCase.create({
      data: {
        orderId,
        customerId: requestedCustomerId,
        reason: payload.reason,
        paymentType: payload.paymentType,
        refundAmount: payload.refundAmount,
        notes: payload.notes,
        refundStatus: "NOT_APPLICABLE",
        returnStatus: "RETURN_INITIATED",
      },
    });

    await createHistoryEntry(tx, created.id, actor, {
      action: "RETURN_CASE_CREATED",
      toStatus: created.returnStatus,
      note: "Return case manually created.",
    });

    return tx.returnCase.findUnique({
      where: { id: created.id },
      include: returnCaseInclude(),
    });
  });
};

/**
 * Automatically create return case when order reaches terminal failed/returned state.
 * @param {Object} payload
 * @param {Object} actor
 * @returns {Promise<Object>}
 */
const autoCreateReturnCaseFromOrderEvent = async (payload, actor) => {
  assertManagerAccess(actor);
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
        paymentType: order.paymentType,
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
  });
};

/**
 * Update an existing return case by ID.
 * @param {number} id
 * @param {UpdateReturnCasePayload} payload
 * @returns {Promise<Object>}
 */
const updateReturnCase = async (id, payload, actor) => {
  assertManagerAccess(actor);

  const currentCase = await prisma.returnCase.findUnique({
    where: { id },
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
  });
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

module.exports = {
  listReturnCases,
  getReturnCaseById,
  createReturnCase,
  autoCreateReturnCaseFromOrderEvent,
  updateReturnCase,
  transitionReturnCaseStatus,
  listReturnCaseHistory,
  deleteReturnCase,
};
