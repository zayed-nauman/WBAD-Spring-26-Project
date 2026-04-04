const prisma = require('../config/prisma');
const { generateLabelPdf } = require('../utils/label');

const MANAGER_ROLES = new Set(['ADMIN', 'DISPATCHER']);
const RIDER_ALLOWED_STATUSES = new Set([
  'PICKUP_IN_PROGRESS',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERY_ATTEMPT',
  'DELIVERED',
  'FAILED',
]);

const ORDER_TRANSITIONS = {
  ORDER_RECEIVED: ['FULFILLMENT'],
  FULFILLMENT: ['LABEL_GENERATION', 'FAILED'],
  LABEL_GENERATION: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['PICKUP_IN_PROGRESS'],
  PICKUP_IN_PROGRESS: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['SHIPMENT_DISPATCHED'],
  SHIPMENT_DISPATCHED: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERY_ATTEMPT', 'DELIVERED', 'FAILED'],
  DELIVERY_ATTEMPT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  DELIVERED: ['RETURNED'],
  FAILED: ['RETURNED'],
  RETURNED: [],
};

const buildError = (message, code, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const canManageOrders = (user = {}) => MANAGER_ROLES.has(normalizeRole(user.role));

/**
 * Get all orders.
 * @returns {Promise<Array<Object>>}
 */
const listOrders = async () => {
  return prisma.order.findMany({
    include: { riderAssignment: { include: { rider: true } }, returnCase: true },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get a single order by ID.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
const getOrderById = async (id) => {
  return prisma.order.findUnique({
    where: { id },
    include: { riderAssignment: { include: { rider: true } }, returnCase: true },
  });
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
  const blacklisted = await prisma.blacklistedNumber.findUnique({
    where: { phoneNumber: payload.phoneNumber },
  });

  // Basic inventory check: assume payload.items is a product name for simple demo
  let fulfillmentStatus = 'UNFULFILLED';
  try {
    const inventory = await prisma.inventory.findUnique({ where: { productName: payload.items } });
    if (inventory && inventory.quantity > 0) {
      fulfillmentStatus = 'FULFILLED';
      await prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: { decrement: 1 } } });
    }
  } catch (e) {
    // ignore inventory errors for now
  }

  const order = await prisma.order.create({
    data: {
      senderName: payload.senderName || null,
      senderPhone: payload.senderPhone || null,
      receiverName: payload.receiverName || payload.customerName,
      receiverPhone: payload.receiverPhone || payload.phoneNumber,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      address: payload.address,
      city: payload.city,
      items: payload.items,
      weightKg: Number(payload.weightKg) > 0 ? Number(payload.weightKg) : 1,
      paymentType: payload.paymentType,
      codAmount: payload.codAmount || null,
      isFragile: payload.isFragile || false,
      isBlacklisted: !!blacklisted,
      blacklistedReason: blacklisted?.reason || null,
      fulfillmentResult: fulfillmentStatus,
      createdBy: userId,
    },
  });

  return { order, isBlacklisted: !!blacklisted };
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
 * @param {{confirmBlacklisted?:boolean, returnReason?:string, paymentType?:string}} [metadata]
 */
const updateOrderStatus = async (id, status, user = {}, metadata = {}) => {
  const existing = await prisma.order.findUnique({ where: { id }, include: { riderAssignment: true } });
  if (!existing) throw new Error('Order not found');

  const normalizedStatus = String(status || '').trim().toUpperCase();

  if (!ORDER_TRANSITIONS[normalizedStatus]) {
    throw buildError('Invalid order status.', 'INVALID_STATUS', 400);
  }

  const role = normalizeRole(user.role);

  if (!canManageOrders(user) && role !== 'RIDER') {
    throw buildError('Only admin, dispatcher, or assigned rider can update status.', 'FORBIDDEN', 403);
  }

  if (role === 'RIDER' && !RIDER_ALLOWED_STATUSES.has(normalizedStatus)) {
    throw buildError('Rider cannot set this status.', 'RIDER_STATUS_NOT_ALLOWED', 403);
  }

  const allowedNext = ORDER_TRANSITIONS[existing.status] || [];
  if (!allowedNext.includes(normalizedStatus) && existing.status !== normalizedStatus) {
    throw buildError(`Invalid transition from ${existing.status} to ${normalizedStatus}.`, 'INVALID_TRANSITION', 400);
  }

  // If customer is blacklisted and trying to move beyond initial stage, warn/block
  const dangerousStatuses = ['FULFILLMENT', 'LABEL_GENERATION', 'READY_FOR_PICKUP', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPMENT_DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  if (existing.isBlacklisted && dangerousStatuses.includes(normalizedStatus) && !metadata.confirmBlacklisted) {
    throw buildError('Order is blacklisted. Confirmation required before fulfillment action.', 'ORDER_BLACKLISTED', 409);
  }

  // If the user is a rider, ensure they are assigned to this order
  if (role === 'RIDER') {
    const riderId = Number(user.riderId);
    if (!existing.riderAssignment || existing.riderAssignment.riderId !== riderId) {
      throw buildError('Rider is not assigned to this order.', 'NOT_ASSIGNED_TO_RIDER', 403);
    }
  }

  const data = { status: normalizedStatus };

  if (normalizedStatus === 'FULFILLMENT') {
    const inventory = await prisma.inventory.findUnique({ where: { productName: existing.items } });
    const canFulfill = Boolean(inventory && inventory.quantity > 0);
    data.fulfillmentResult = canFulfill ? 'FULFILLED' : 'UNFULFILLED';

    if (canFulfill) {
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: 1 } },
      });
    }
  }

  if (normalizedStatus === 'LABEL_GENERATION') {
    data.labelGenerated = false;
  }

  const updatedOrder = await prisma.order.update({ where: { id }, data });

  if (['DELIVERED', 'FAILED', 'RETURNED'].includes(normalizedStatus) && existing.riderAssignment) {
    const assignedRider = await prisma.rider.findUnique({ where: { id: existing.riderAssignment.riderId } });

    if (assignedRider) {
    await prisma.rider.update({
      where: { id: assignedRider.id },
      data: {
        currentLoad: Math.max(0, assignedRider.currentLoad - 1),
        currentWeight: Math.max(0, assignedRider.currentWeight - (existing.weightKg || 1)),
      },
    });
    }
  }

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
        paymentType: existing.paymentType,
        orderTerminalStatus: normalizedStatus,
        refundAmount: existing.paymentType === 'PREPAID' ? existing.codAmount || 0 : null,
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
const generateOrderLabel = async (id) => {
  const order = await prisma.order.findUnique({ where: { id }, include: { user: true } });
  if (!order) throw new Error('Order not found');

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
const deleteOrder = async (id) => {
  await prisma.order.delete({ where: { id } });
};

module.exports = {
  listOrders,
  getOrderById,
  listOrdersByUser,
  createOrder,
  updateOrderStatus,
  generateOrderLabel,
  deleteOrder,
};
