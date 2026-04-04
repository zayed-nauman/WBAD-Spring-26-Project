const prisma = require('../config/prisma');
const { geocodeAddress } = require('../utils/geocode');
const { calculateDistanceKm } = require('../utils/distance');

/**
 * List riders.
 * @returns {Promise<Array<Object>>}
 */
const listRiders = async () => {
  return prisma.rider.findMany({ orderBy: { name: 'asc' } });
};

/**
 * Get rider recommendations for an order.
 * @param {number} orderId
 * @returns {Promise<Array<Object>|null>}
 */
const recommendRiders = async (orderId) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  let destination = null;
  try {
    destination = await geocodeAddress(`${order.address}, ${order.city}`);
  } catch {
    destination = null;
  }

  const riders = await prisma.rider.findMany({
    where: { isAvailable: true, zone: order.city },
  });

  const scored = riders
    .filter((r) => r.currentLoad < r.maxLoad && r.currentWeight < r.maxWeight)
    .map((r) => {
      const distanceKm = destination && r.latitude != null && r.longitude != null
        ? calculateDistanceKm(destination.latitude, destination.longitude, r.latitude, r.longitude)
        : null;

      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        zone: r.zone,
        isAvailable: r.isAvailable,
        distanceKm: distanceKm == null ? null : Number(distanceKm.toFixed(2)),
        currentLoad: r.currentLoad,
        maxLoad: r.maxLoad,
        loadLabel: `${r.currentLoad}/${r.maxLoad} orders`,
        currentWeight: Number(r.currentWeight.toFixed(2)),
        maxWeight: Number(r.maxWeight.toFixed(2)),
        weightLabel: `${Number(r.currentWeight.toFixed(2))}kg / ${Number(r.maxWeight.toFixed(2))}kg`,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return a.currentLoad - b.currentLoad;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, 3);

  return scored;
};

/**
 * Create rider.
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
const createRider = async (payload) => {
  return prisma.rider.create({
    data: {
      name: payload.name,
      phone: payload.phone,
      zone: payload.zone,
      maxLoad: payload.maxLoad || 28,
      maxWeight: payload.maxWeight || 40,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
  });
};

/**
 * Assign rider to order.
 * @param {number} orderId
 * @param {number} riderId
 * @returns {Promise<Object>}
 */
const assignRider = async (orderId, riderId) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error('Order not found');
  }

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) {
    throw new Error('Rider not found');
  }

  if (!rider.isAvailable || rider.currentLoad >= rider.maxLoad || rider.currentWeight >= rider.maxWeight) {
    const err = new Error('RIDER_CAPACITY_EXCEEDED');
    err.code = 'RIDER_CAPACITY_EXCEEDED';
    throw err;
  }

  if (rider.zone !== order.city) {
    const err = new Error('RIDER_OUTSIDE_ZONE');
    err.code = 'RIDER_OUTSIDE_ZONE';
    throw err;
  }

  const assignment = await prisma.riderAssignment.upsert({
    where: { orderId },
    update: { riderId, status: 'ASSIGNED', assignedAt: new Date() },
    create: { orderId, riderId, status: 'ASSIGNED' },
  });

  await prisma.rider.update({
    where: { id: riderId },
    data: {
      currentLoad: { increment: 1 },
      currentWeight: { increment: order.weightKg || 1 },
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'READY_FOR_PICKUP' },
  });

  // Notify rider - simple console log for now (placeholder for real notification)
  try {
    console.info(`Notify Rider ${rider.name} (${rider.phone}): assigned order ${order.trackingNumber}`);
  } catch (e) {
    console.warn('Failed to load rider/order for notification', e?.message || e);
  }

  return assignment;
};

/**
 * Update rider.
 * @param {number} id
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
const updateRider = async (id, payload) => {
  return prisma.rider.update({
    where: { id },
    data: {
      name: payload.name,
      phone: payload.phone,
      zone: payload.zone,
      isAvailable: payload.isAvailable,
      maxLoad: payload.maxLoad,
      maxWeight: payload.maxWeight,
    },
  });
};

/**
 * Delete rider.
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteRider = async (id) => {
  await prisma.rider.delete({ where: { id } });
};

module.exports = {
  listRiders,
  recommendRiders,
  createRider,
  assignRider,
  updateRider,
  deleteRider,
};
