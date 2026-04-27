const prisma = require('../config/prisma');
const { generateLabelPdf } = require('../utils/label');
const { isPhoneNumberBlacklisted, normalizePhoneNumber } = require('./blacklist.service');

const WEIGHT_LOCKED_STATUSES = new Set([
  'READY_FOR_PICKUP',
  'PICKUP_IN_PROGRESS',
  'PICKED_UP',
  'SHIPMENT_DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERY_ATTEMPT',
  'DELIVERED',
  'FAILED',
  'RETURNED',
]);

const ASSIGNMENT_ALLOWED_STATUSES = new Set([
  'PICKUP_IN_PROGRESS',
  'PICKED_UP',
  'SHIPMENT_DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURNED',
]);

const LABEL_PRINTABLE_STATUSES = new Set(['FULFILLMENT', 'LABEL_GENERATION', 'READY_FOR_PICKUP']);

const buildError = (message, code, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const UI_ORDER_STATUSES = new Set([
  'ORDER_RECEIVED',
  'FULFILLMENT',
  'LABEL_GENERATION',
  'READY_FOR_PICKUP',
  'PICKUP_IN_PROGRESS',
  'PICKED_UP',
  'SHIPMENT_DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERY_ATTEMPT',
  'DELIVERED',
  'FAILED',
  'RETURNED',
]);

const buildOrderWhere = (filters = {}, user = {}) => {
  const where = {};
  const and = [];

  and.push({
    OR: [
      { riderAssignment: null },
      { status: 'RETURNED' },
    ],
  });

  if (filters.city) {
    where.city = { contains: String(filters.city), mode: 'insensitive' };
  }

  if (filters.sender) {
    where.senderName = { contains: String(filters.sender), mode: 'insensitive' };
  }

  if (filters.price) {
    const amount = Number(filters.price);
    if (!Number.isNaN(amount)) where.codAmount = amount;
  }

  if (filters.status) {
    const normalizedStatus = String(filters.status).trim().toUpperCase();
    if (normalizedStatus !== 'BLACKLISTED') {
      where.status = normalizedStatus;
    }
  }

  if (filters.search) {
    const search = String(filters.search);
    and.push({
      OR: [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { receiverName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { receiverPhone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (and.length) where.AND = and;

  return where;
};

const nextTrackingNumber = async () => {
  const latest = await prisma.order.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  return `SWF-${String((latest?.id || 0) + 1).padStart(5, '0')}`;
};

const normalizeOrderPayload = (payload = {}) => {
  const phoneNumber = payload.phoneNumber || payload.receiverPhone;
  const recipientName = payload.recipientName || payload.receiverName || payload.customerName;
  const amount = payload.amount ?? payload.codAmount;

  return {
    senderName: payload.senderName || null,
    senderPhone: payload.senderPhone || null,
    receiverName: recipientName,
    receiverPhone: phoneNumber,
    customerName: recipientName,
    phoneNumber,
    address: payload.address,
    city: payload.city,
    numberOfPieces: Number(payload.numberOfPieces) > 0 ? Number(payload.numberOfPieces) : 1,
    weightKg: Number(payload.weightKg) > 0 ? Number(payload.weightKg) : 1,
    codAmount: amount === undefined || amount === null || amount === '' ? null : Number(amount),
    paymentType: payload.paymentType || null,
    isFragile: Boolean(payload.fragile ?? payload.isFragile),
    createdAt: payload.date ? new Date(payload.date) : undefined,
  };
};

const decorateOrdersWithBlacklist = async (orders) => {
  const blacklistedNumbers = await prisma.blacklistedNumber.findMany();
  const normalizedBlacklist = new Map(
    blacklistedNumbers.map((entry) => [normalizePhoneNumber(entry.phoneNumber), entry])
  );

  return orders.map((order) => {
    const blacklisted = normalizedBlacklist.get(normalizePhoneNumber(order.phoneNumber));

    if (!blacklisted) return order;

    return {
      ...order,
      isBlacklisted: true,
      blacklistedReason: order.blacklistedReason || blacklisted.reason || null,
    };
  });
};

const recalculateAssignedRiderCapacity = async (tx, riderId) => {
  const assignments = await tx.riderAssignment.findMany({
    where: {
      riderId,
      order: {
        status: {
          notIn: ['DELIVERED', 'RETURNED', 'FAILED'],
        },
      },
    },
    include: {
      order: true,
    },
  });

  const currentLoad = assignments.length;
  const currentWeight = assignments.reduce((sum, assignment) => sum + Number(assignment.order.weightKg || 0), 0);

  await tx.rider.update({
    where: { id: riderId },
    data: {
      currentLoad,
      currentWeight: Number(currentWeight.toFixed(2)),
    },
  });
};

/**
 * Get all orders.
 * @returns {Promise<Array<Object>>}
 */
const listOrders = async (filters = {}, user = {}) => {
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(filters, user),
    include: { riderAssignment: { include: { rider: true } }, returnCase: true },
    orderBy: { createdAt: 'desc' },
  });

  const decoratedOrders = await decorateOrdersWithBlacklist(orders);

  if (String(filters.status || '').trim().toUpperCase() === 'BLACKLISTED') {
    return decoratedOrders.filter((order) => order.isBlacklisted);
  }

  if (filters.status) {
    return decoratedOrders.filter((order) => !order.isBlacklisted);
  }

  return decoratedOrders;
};

/**
 * Get a single order by ID.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
const getOrderById = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { riderAssignment: { include: { rider: true } }, returnCase: true },
  });

  if (!order) return null;

  const [decorated] = await decorateOrdersWithBlacklist([order]);
  return decorated;
};

/**
 * List orders created by a specific user.
 * @param {number} userId
 */
const listOrdersByUser = async (userId) => {
  return prisma.order.findMany({ where: { createdBy: userId }, orderBy: { createdAt: 'desc' } });
};

/**
 * Create a new order.
 * @param {Object} payload
 * @param {number} userId
 * @returns {Promise<{order: Object, isBlacklisted: boolean}>}
 */
const createOrder = async (payload, userId) => {
  const data = normalizeOrderPayload(payload);
  const normalizedPhoneNumber = normalizePhoneNumber(data.phoneNumber);
  const blacklisted = await isPhoneNumberBlacklisted(data.phoneNumber);

  const order = await prisma.order.create({
    data: {
      ...data,
      phoneNumber: normalizedPhoneNumber,
      receiverPhone: normalizedPhoneNumber,
      isBlacklisted: !!blacklisted,
      blacklistedReason: blacklisted?.reason || null,
      createdBy: userId,
    },
  });

  const trackingNumber = payload.orderNumber || `SWF-${String(order.id).padStart(5, '0')}`;
  const updatedOrder = await prisma.order.update({ where: { id: order.id }, data: { trackingNumber } });

  return { order: updatedOrder, isBlacklisted: !!blacklisted };
};

const updateOrder = async (id, payload, user = {}) => {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw buildError('Order not found', 'ORDER_NOT_FOUND', 404);

  if (existing.labelGenerated) {
    throw buildError('The order has already been processed for pickup', 'ORDER_PROCESSED_FOR_PICKUP', 400);
  }

  const data = normalizeOrderPayload(payload);
  if (WEIGHT_LOCKED_STATUSES.has(existing.status) && Number(data.weightKg) !== Number(existing.weightKg)) {
    throw buildError('Weight cannot be edited once an order is ready for pickup.', 'WEIGHT_LOCKED', 400);
  }

  const normalizedPhoneNumber = normalizePhoneNumber(data.phoneNumber);
  const blacklisted = await isPhoneNumberBlacklisted(data.phoneNumber);

  return prisma.order.update({
    where: { id },
    data: {
      ...data,
      phoneNumber: normalizedPhoneNumber,
      receiverPhone: normalizedPhoneNumber,
      isBlacklisted: !!blacklisted,
      blacklistedReason: blacklisted?.reason || null,
    },
  });
};

/**
 * Update order status.
 * @param {number} id
 * @param {string} status
 * @returns {Promise<Object>}
 */
/**
 * Update order status with basic validations (blacklist enforcement).
 * @param {number} id
 * @param {string} status
 * @param {{id?:number,role?:string}} [user]
 * @param {{confirmBlacklisted?:boolean, returnReason?:string}} [metadata]
 */
const updateOrderStatus = async (id, status, user = {}, metadata = {}) => {
  const existing = await prisma.order.findUnique({ where: { id }, include: { riderAssignment: true } });
  if (!existing) throw new Error('Order not found');

  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (!UI_ORDER_STATUSES.has(normalizedStatus)) {
    throw buildError('Invalid order status.', 'INVALID_STATUS', 400);
  }

  const fromOrderAssignments = String(metadata.statusContext || '').trim().toUpperCase() === 'ORDER_ASSIGNMENT';
  const canUpdateAssignedOrder = fromOrderAssignments && Boolean(existing.riderAssignment);

  if (fromOrderAssignments && !canUpdateAssignedOrder) {
    throw buildError('Only assigned orders can be updated from Order Assignments.', 'ORDER_ASSIGNMENT_REQUIRED', 400);
  }

  if (fromOrderAssignments && !ASSIGNMENT_ALLOWED_STATUSES.has(normalizedStatus)) {
    throw buildError('This status is not available from Order Assignments.', 'ASSIGNMENT_STATUS_NOT_ALLOWED', 400);
  }

  if (existing.status === 'DELIVERED' && normalizedStatus !== 'DELIVERED') {
    throw buildError('Delivered orders cannot be moved back to an active delivery status.', 'DELIVERED_STATUS_LOCKED', 400);
  }

  // If customer is blacklisted and trying to move beyond initial stage, warn/block
  const dangerousStatuses = ['FULFILLMENT', 'LABEL_GENERATION', 'READY_FOR_PICKUP', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPMENT_DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  if (existing.isBlacklisted && dangerousStatuses.includes(normalizedStatus) && !metadata.confirmBlacklisted) {
    throw buildError('Order is blacklisted. Confirmation required before fulfillment action.', 'ORDER_BLACKLISTED', 409);
  }

  const data = { status: normalizedStatus };

  if (normalizedStatus === 'FULFILLMENT') {
    data.fulfillmentResult = 'FULFILLED';
  }

  if (normalizedStatus === 'LABEL_GENERATION') {
    data.labelGenerated = false;
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({ where: { id }, data });

    if (existing.riderAssignment) {
      await tx.riderAssignment.update({
        where: { orderId: existing.id },
        data: { status: normalizedStatus },
      });
    }

    if (normalizedStatus === 'DELIVERED' && existing.riderAssignment) {
      await recalculateAssignedRiderCapacity(tx, existing.riderAssignment.riderId);
    }

    return order;
  });

  if (['FAILED', 'RETURNED'].includes(normalizedStatus)) {
    if (!metadata.returnReason) {
      throw buildError('Return reason is required when order is failed or returned.', 'RETURN_REASON_REQUIRED', 400);
    }

    await prisma.returnCase.upsert({
      where: { orderId: existing.id },
      update: {
        reason: metadata.returnReason,
        orderTerminalStatus: normalizedStatus,
      },
      create: {
        orderId: existing.id,
        customerId: existing.createdBy || null,
        reason: metadata.returnReason,
        orderTerminalStatus: normalizedStatus,
        refundAmount: null,
      },
    });
  }

  return prisma.order.findUnique({
    where: { id: updatedOrder.id },
    include: { riderAssignment: { include: { rider: true } }, returnCase: true },
  });
};

/**
 * Generate shipping label for order.
 * @param {number} id
 * @returns {Promise<Object>}
 */
/**
 * Generate shipping label PDF and mark order as labelGenerated.
 * Returns { order, pdfBuffer, filename }
 */
const generateOrderLabel = async (id, user = {}) => {
  const order = await prisma.order.findUnique({ where: { id }, include: { user: true } });
  if (!order) throw new Error('Order not found');

  if (!LABEL_PRINTABLE_STATUSES.has(order.status)) {
    throw buildError('Label can only be printed for fulfilled or ready for pickup orders.', 'LABEL_STATUS_NOT_ALLOWED', 400);
  }

  const buffer = await generateLabelPdf(order);

  await prisma.order.update({
    where: { id },
    data: {
      labelGenerated: true,
      labelGeneratedAt: new Date(),
      status: 'READY_FOR_PICKUP',
    },
  });

  const filename = `label_${order.trackingNumber}.pdf`;

  return { order, pdfBuffer: buffer, filename };
};

/**
 * Delete order by ID.
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteOrder = async (id, user = {}) => {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw buildError('Order not found', 'ORDER_NOT_FOUND', 404);

  await prisma.order.delete({ where: { id } });
};

module.exports = {
  nextTrackingNumber,
  listOrders,
  getOrderById,
  listOrdersByUser,
  createOrder,
  updateOrder,
  updateOrderStatus,
  generateOrderLabel,
  deleteOrder,
};
