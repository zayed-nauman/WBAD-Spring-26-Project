const prisma = require('../config/prisma');
const { geocodeAddress } = require('../utils/geocode');
const { calculateDistanceKm } = require('../utils/distance');

const buildError = (message, code, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const formatRiderNumber = (id) => `RDR-${String(id).padStart(5, '0')}`;

const getRiderCapacity = (rider) => ({
  currentOrderCount: rider.currentLoad ?? 0,
  orderCapacity: rider.maxLoad ?? 28,
  currentWeightKg: Number(rider.currentWeight ?? 0),
  weightCapacityKg: Number(rider.maxWeight ?? 40),
});

const normalizeRider = (rider) => {
  if (!rider) return null;
  const capacity = getRiderCapacity(rider);
  return {
    ...rider,
    riderNumber: rider.riderNumber || formatRiderNumber(rider.id),
    phoneNumber: rider.phoneNumber || rider.phone,
    city: rider.city || rider.zone,
    location: rider.location || rider.depotName || rider.zone,
    vehicle: rider.vehicle || 'Bike',
    depotName: rider.depotName || rider.location || rider.zone,
    ...capacity,
  };
};

const normalizeOrder = (order) => ({
  ...order,
  orderNumber: order.trackingNumber,
  recipientName: order.receiverName || order.customerName,
  amount: order.codAmount,
  numberOfPieces: order.numberOfPieces || 1,
  zone: order.zone || order.city,
});

const recalculateRiderCapacity = async (riderId, tx = prisma) => {
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

  return tx.rider.update({
    where: { id: riderId },
    data: {
      currentLoad,
      currentWeight: Number(currentWeight.toFixed(2)),
    },
  });
};

const recalculateRiderCapacities = async (riders) => Promise.all(riders.map((rider) => recalculateRiderCapacity(rider.id)));

const geocodeSafe = async (query) => {
  try {
    return await geocodeAddress(query);
  } catch {
    return null;
  }
};

const geocodeFirst = async (queries) => {
  for (const query of queries) {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) continue;

    const geo = await geocodeSafe(normalizedQuery);
    if (geo) return geo;
  }

  return null;
};

const enrichRiderCoordinates = async (rider) => {
  if (rider.latitude != null && rider.longitude != null) return rider;

  const geo = await geocodeFirst([
    [rider.location, rider.city || rider.zone, 'Pakistan'].filter(Boolean).join(', '),
    [rider.depotName, rider.city || rider.zone, 'Pakistan'].filter(Boolean).join(', '),
    [rider.location, 'Pakistan'].filter(Boolean).join(', '),
    [rider.city || rider.zone, 'Pakistan'].filter(Boolean).join(', '),
  ]);
  if (!geo) return rider;

  try {
    return await prisma.rider.update({
      where: { id: rider.id },
      data: { latitude: geo.latitude, longitude: geo.longitude },
    });
  } catch {
    return { ...rider, latitude: geo.latitude, longitude: geo.longitude };
  }
};

const nextRiderNumber = async () => {
  const latest = await prisma.rider.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  return formatRiderNumber((latest?.id || 0) + 1);
};

const listRiders = async (filters = {}) => {
  const where = {};
  const and = [];

  if (filters.city) where.city = { contains: String(filters.city), mode: 'insensitive' };
  if (filters.location) where.location = { contains: String(filters.location), mode: 'insensitive' };
  if (filters.capacity) {
    const capacity = Number(filters.capacity);
    if (!Number.isNaN(capacity)) where.maxWeight = { gte: capacity };
  }
  if (filters.search) {
    const search = String(filters.search);
    and.push({
      OR: [
        { riderNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { vehicle: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (and.length) where.AND = and;

  const riders = await prisma.rider.findMany({ where, orderBy: { id: 'asc' } });
  const syncedRiders = await recalculateRiderCapacities(riders);
  return syncedRiders.map(normalizeRider);
};

const getRiderById = async (id) => {
  const rider = await prisma.rider.findUnique({ where: { id } });
  if (!rider) return null;

  return normalizeRider(await recalculateRiderCapacity(rider.id));
};

const listReadyOrders = async (filters = {}) => {
  const where = {
    status: 'READY_FOR_PICKUP',
    riderAssignment: null,
  };

  if (filters.city) where.city = { contains: String(filters.city), mode: 'insensitive' };
  if (filters.sender) where.senderName = { contains: String(filters.sender), mode: 'insensitive' };
  if (filters.price) {
    const price = Number(filters.price);
    if (!Number.isNaN(price)) where.codAmount = price;
  }
  if (filters.search) {
    const search = String(filters.search);
    where.OR = [
      { trackingNumber: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
      { receiverName: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: { riderAssignment: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(normalizeOrder);
};

const listAssignedOrders = async (filters = {}) => {
  const assignments = await prisma.riderAssignment.findMany({
    include: {
      order: true,
      rider: true,
    },
    orderBy: { assignedAt: 'desc' },
  });

  const search = String(filters.search || '').trim().toLowerCase();
  const city = String(filters.city || '').trim().toLowerCase();
  const location = String(filters.location || '').trim().toLowerCase();
  const capacity = Number(filters.capacity);

  return assignments
    .map((assignment) => ({
      ...normalizeOrder(assignment.order),
      riderAssignment: {
        ...assignment,
        rider: normalizeRider(assignment.rider),
      },
    }))
    .filter((order) => {
      const rider = order.riderAssignment.rider;
      const haystack = [
        rider.riderNumber,
        rider.name,
        order.trackingNumber,
        order.senderName,
        order.receiverName,
        order.city,
        order.address,
        rider.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (search && !haystack.includes(search)) return false;
      if (city && !String(order.city || '').toLowerCase().includes(city)) return false;
      if (location && !String(order.address || rider.location || '').toLowerCase().includes(location)) return false;
      if (!Number.isNaN(capacity) && capacity > 0 && Number(rider.weightCapacityKg || 0) < capacity) return false;

      return true;
    });
};

const getAssignedOrder = async (orderId) => {
  const assignment = await prisma.riderAssignment.findUnique({
    where: { orderId: Number(orderId) },
    include: {
      order: true,
      rider: true,
    },
  });

  if (!assignment) return null;

  return {
    ...normalizeOrder(assignment.order),
    riderAssignment: {
      ...assignment,
      rider: normalizeRider(assignment.rider),
    },
  };
};

const recommendRiders = async (orderId) => {
  const order = await prisma.order.findUnique({ where: { id: Number(orderId) } });
  if (!order) return null;

  const normalizedOrder = normalizeOrder(order);
  const orderWeight = Number(order.weightKg || 1);
  const orderZone = normalizedOrder.zone;
  const destination = await geocodeFirst([
    [order.address, order.city, 'Pakistan'].filter(Boolean).join(', '),
    [order.address, 'Pakistan'].filter(Boolean).join(', '),
    [order.city, 'Pakistan'].filter(Boolean).join(', '),
  ]);

  const allRiders = await recalculateRiderCapacities(await prisma.rider.findMany({ orderBy: { id: 'asc' } }));
  const scored = [];
  let skippedCount = 0;

  for (const rawRider of allRiders) {
    const rider = normalizeRider(await enrichRiderCoordinates(rawRider));
    const capacity = getRiderCapacity(rider);
    const unavailable =
      !rider.isAvailable ||
      capacity.currentOrderCount >= capacity.orderCapacity ||
      capacity.currentWeightKg + orderWeight > capacity.weightCapacityKg;

    if (unavailable) {
      skippedCount += 1;
      continue;
    }

    const sameZone = String(rider.zone || '').toLowerCase() === String(orderZone || '').toLowerCase();
    const distanceKm =
      destination && rider.latitude != null && rider.longitude != null
        ? Number(calculateDistanceKm(destination.latitude, destination.longitude, rider.latitude, rider.longitude).toFixed(1))
        : null;

    scored.push({
      ...rider,
      sameZone,
      distanceKm,
      riderCoordinates:
        rider.latitude != null && rider.longitude != null
          ? { latitude: rider.latitude, longitude: rider.longitude }
          : null,
      deliveryCoordinates: destination
        ? { latitude: destination.latitude, longitude: destination.longitude }
        : null,
      loadLabel: `${capacity.currentOrderCount}/${capacity.orderCapacity} orders`,
      weightLabel: `${Number(capacity.currentWeightKg.toFixed(1))}/${Number(capacity.weightCapacityKg.toFixed(1))} kg`,
    });
  }

  scored.sort((a, b) => {
    if (a.sameZone !== b.sameZone) return a.sameZone ? -1 : 1;
    if (a.distanceKm == null && b.distanceKm != null) return 1;
    if (a.distanceKm != null && b.distanceKm == null) return -1;
    if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (a.currentOrderCount !== b.currentOrderCount) return a.currentOrderCount - b.currentOrderCount;
    return a.currentWeightKg - b.currentWeightKg;
  });

  return { order: normalizedOrder, riders: scored.slice(0, 3), skippedCount };
};

const createRider = async (payload) => {
  const location = [payload.location, payload.city].filter(Boolean).join(', ');
  const geo = await geocodeSafe(location);
  const created = await prisma.rider.create({
    data: {
      riderNumber: payload.riderNumber || null,
      name: payload.riderName || payload.name,
      phone: payload.phoneNumber || payload.phone,
      phoneNumber: payload.phoneNumber || payload.phone,
      city: payload.city || payload.zone,
      location: payload.location || payload.depotName || payload.zone,
      vehicle: payload.vehicle || 'Bike',
      depotName: payload.depotName || payload.location || payload.zone,
      zone: payload.zone || payload.city,
      maxLoad: Number(payload.orderCapacity || payload.maxLoad || 28),
      maxWeight: Number(payload.weightCapacityKg || payload.maxWeight || 40),
      currentLoad: Number(payload.currentOrderCount || payload.currentLoad || 0),
      currentWeight: Number(payload.currentWeightKg || payload.currentWeight || 0),
      joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : undefined,
      latitude: payload.latitude ?? geo?.latitude,
      longitude: payload.longitude ?? geo?.longitude,
      isAvailable: payload.isAvailable ?? true,
    },
  });

  if (created.riderNumber) return normalizeRider(created);

  return normalizeRider(
    await prisma.rider.update({
      where: { id: created.id },
      data: { riderNumber: formatRiderNumber(created.id) },
    })
  );
};

const updateRider = async (id, payload) => {
  const existing = await prisma.rider.findUnique({ where: { id } });
  if (!existing) throw buildError('Rider not found', 'RIDER_NOT_FOUND', 404);

  const location = [payload.location, payload.city].filter(Boolean).join(', ');
  const geo = location ? await geocodeSafe(location) : null;

  return normalizeRider(
    await prisma.rider.update({
      where: { id },
      data: {
        name: payload.riderName || payload.name,
        phone: payload.phoneNumber || payload.phone,
        phoneNumber: payload.phoneNumber || payload.phone,
        city: payload.city || payload.zone,
        location: payload.location || payload.depotName || payload.zone,
        vehicle: payload.vehicle,
        depotName: payload.depotName || payload.location || payload.zone,
        zone: payload.zone || payload.city,
        maxLoad: payload.orderCapacity != null ? Number(payload.orderCapacity) : undefined,
        maxWeight: payload.weightCapacityKg != null ? Number(payload.weightCapacityKg) : undefined,
        joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : undefined,
        latitude: payload.latitude ?? geo?.latitude,
        longitude: payload.longitude ?? geo?.longitude,
        isAvailable: payload.isAvailable,
      },
    })
  );
};

const assignRider = async (orderId, riderId) => {
  const numericOrderId = Number(orderId);
  const numericRiderId = Number(riderId);

  const order = await prisma.order.findUnique({ where: { id: numericOrderId }, include: { riderAssignment: true } });
  if (!order) throw buildError('Order not found', 'ORDER_NOT_FOUND', 404);

  const rawRider = await prisma.rider.findUnique({ where: { id: numericRiderId } });
  if (!rawRider) throw buildError('Rider not found', 'RIDER_NOT_FOUND', 404);

  const rider = await recalculateRiderCapacity(numericRiderId);
  if (!rider) throw buildError('Rider not found', 'RIDER_NOT_FOUND', 404);

  const normalizedRider = normalizeRider(rider);
  const orderWeight = Number(order.weightKg || 1);
  const alreadyAssignedToRider = order.riderAssignment?.riderId === numericRiderId;
  if (
    !rider.isAvailable ||
    (!alreadyAssignedToRider && normalizedRider.currentOrderCount >= normalizedRider.orderCapacity) ||
    normalizedRider.currentWeightKg + (alreadyAssignedToRider ? 0 : orderWeight) > normalizedRider.weightCapacityKg
  ) {
    throw buildError('Rider capacity limit reached or unavailable.', 'RIDER_CAPACITY_EXCEEDED', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    if (order.riderAssignment && order.riderAssignment.riderId !== numericRiderId) {
      const previousRider = await tx.rider.findUnique({ where: { id: order.riderAssignment.riderId } });
      if (previousRider) {
        await tx.rider.update({
          where: { id: previousRider.id },
          data: {
            currentLoad: Math.max(0, previousRider.currentLoad - 1),
            currentWeight: Math.max(0, previousRider.currentWeight - orderWeight),
          },
        });
      }
    }

    const assignment = await tx.riderAssignment.upsert({
      where: { orderId: numericOrderId },
      update: { riderId: numericRiderId, status: 'ASSIGNED', assignedAt: new Date() },
      create: { orderId: numericOrderId, riderId: numericRiderId, status: 'ASSIGNED' },
    });

    if (!order.riderAssignment || order.riderAssignment.riderId !== numericRiderId) {
      await tx.rider.update({
        where: { id: numericRiderId },
        data: {
          currentLoad: { increment: 1 },
          currentWeight: { increment: orderWeight },
        },
      });
    }

    const updatedOrder = await tx.order.update({
      where: { id: numericOrderId },
      data: {
        status: 'PICKUP_IN_PROGRESS',
        assignedRiderId: numericRiderId,
        assignedAt: new Date(),
        zone: order.zone || order.city,
      },
      include: { riderAssignment: { include: { rider: true } } },
    });

    return { assignment, order: normalizeOrder(updatedOrder), rider: normalizeRider(rider) };
  });

  try {
    console.info(`Notify Rider ${rider.name} (${rider.phone}): assigned order ${order.trackingNumber}`);
  } catch {}

  return result;
};

const deleteRider = async (id) => {
  await prisma.rider.delete({ where: { id } });
};

module.exports = {
  nextRiderNumber,
  listRiders,
  getRiderById,
  listReadyOrders,
  listAssignedOrders,
  getAssignedOrder,
  recommendRiders,
  createRider,
  assignRider,
  updateRider,
  deleteRider,
};
