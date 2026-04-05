const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const prisma = require('../src/config/prisma');
const riderRoutes = require('../src/routes/rider.routes');

const PORT = process.env.PORT || 3102;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (targetPath, options = {}) => {
  const response = await fetch(`${BASE_URL}${targetPath}`, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { status: response.status, data };
};

const run = async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/riders', riderRoutes);
  app.get('/health', (req, res) => res.status(200).json({ success: true }));

  const server = app.listen(PORT);

  const createdUserIds = [];
  const createdOrderIds = [];
  const createdRiderIds = [];

  try {
    const unique = Date.now();

    const dispatcher = await prisma.user.create({
      data: {
        name: `wf2-dispatcher-${unique}`,
        email: `wf2.dispatcher.${unique}@ci.local`,
        password: 'password123',
        role: 'DISPATCHER',
      },
    });
    createdUserIds.push(dispatcher.id);

    const riderUser = await prisma.user.create({
      data: {
        name: `wf2-rider-user-${unique}`,
        email: `wf2.rider.${unique}@ci.local`,
        password: 'password123',
        role: 'RIDER',
      },
    });
    createdUserIds.push(riderUser.id);

    const customer = await prisma.user.create({
      data: {
        name: `wf2-customer-${unique}`,
        email: `wf2.customer.${unique}@ci.local`,
        password: 'password123',
        role: 'CUSTOMER',
      },
    });
    createdUserIds.push(customer.id);

    const assignableOrder = await prisma.order.create({
      data: {
        senderName: 'WF2 Sender',
        senderPhone: '03000000000',
        receiverName: 'WF2 Receiver',
        receiverPhone: '03001111111',
        customerName: 'WF2 Customer',
        phoneNumber: '03001111111',
        address: 'Gulshan Block 7',
        city: 'Karachi',
        items: `WF2-Item-${unique}`,
        weightKg: 2,
        paymentType: 'PREPAID',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(assignableOrder.id);

    const outOfZoneOrder = await prisma.order.create({
      data: {
        senderName: 'WF2 Sender 2',
        senderPhone: '03002222222',
        receiverName: 'WF2 Receiver 2',
        receiverPhone: '03003333333',
        customerName: 'WF2 Customer',
        phoneNumber: '03003333333',
        address: 'Model Town',
        city: 'Lahore',
        items: `WF2-Item-Lahore-${unique}`,
        weightKg: 1,
        paymentType: 'PREPAID',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(outOfZoneOrder.id);

    const heavyOrder = await prisma.order.create({
      data: {
        senderName: 'WF2 Sender 3',
        senderPhone: '03004444444',
        receiverName: 'WF2 Receiver 3',
        receiverPhone: '03005555555',
        customerName: 'WF2 Customer',
        phoneNumber: '03005555555',
        address: 'Shahrah-e-Faisal',
        city: 'Karachi',
        items: `WF2-Heavy-${unique}`,
        weightKg: 3,
        paymentType: 'PREPAID',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(heavyOrder.id);

    const dispatcherHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: dispatcher.id, role: 'DISPATCHER' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };

    const riderHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: riderUser.id, role: 'RIDER' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };

    const customerHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: customer.id, role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };

    const health = await request('/health');
    assert(health.status === 200, 'WF2 health endpoint failed');

    const unauthList = await request('/api/riders');
    assert(unauthList.status === 401, 'Riders list should require auth');

    const customerBlocked = await request('/api/riders', {
      method: 'GET',
      headers: customerHeaders,
    });
    assert(customerBlocked.status === 403, 'CUSTOMER should not access rider list');

    const riderCanList = await request('/api/riders', {
      method: 'GET',
      headers: riderHeaders,
    });
    assert(riderCanList.status === 200, 'RIDER should access rider list');

    const createRiderA = await request('/api/riders', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({
        name: 'WF2 Rider A',
        phone: `03${String(unique).slice(-9)}`,
        zone: 'Karachi',
        maxLoad: 10,
        maxWeight: 20,
        latitude: 24.914,
        longitude: 67.082,
      }),
    });
    assert(createRiderA.status === 200, `Create rider A failed: ${JSON.stringify(createRiderA.data)}`);
    const riderAId = createRiderA.data?.rider?.id;
    assert(typeof riderAId === 'number', 'Missing rider A id');
    createdRiderIds.push(riderAId);

    const createRiderB = await request('/api/riders', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({
        name: 'WF2 Rider B',
        phone: `03${String(unique + 111111111).slice(-9)}`,
        zone: 'Karachi',
        maxLoad: 1,
        maxWeight: 2,
        latitude: 24.944,
        longitude: 67.102,
      }),
    });
    assert(createRiderB.status === 200, `Create rider B failed: ${JSON.stringify(createRiderB.data)}`);
    const riderBId = createRiderB.data?.rider?.id;
    assert(typeof riderBId === 'number', 'Missing rider B id');
    createdRiderIds.push(riderBId);

    const createRiderLahore = await request('/api/riders', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({
        name: 'WF2 Rider Lahore',
        phone: `03${String(unique + 222222222).slice(-9)}`,
        zone: 'Lahore',
        maxLoad: 10,
        maxWeight: 20,
      }),
    });
    assert(createRiderLahore.status === 200, `Create rider Lahore failed: ${JSON.stringify(createRiderLahore.data)}`);
    const riderLahoreId = createRiderLahore.data?.rider?.id;
    assert(typeof riderLahoreId === 'number', 'Missing Lahore rider id');
    createdRiderIds.push(riderLahoreId);

    await prisma.rider.update({
      where: { id: riderBId },
      data: { currentLoad: 1, currentWeight: 2 },
    });

    const recommendNotFound = await request('/api/riders/recommend/99999999', {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(recommendNotFound.status === 404, 'Recommend should return 404 for missing order');

    const recommendations = await request(`/api/riders/recommend/${assignableOrder.id}`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(recommendations.status === 200, 'Recommend riders failed');
    assert(Array.isArray(recommendations.data), 'Recommend response should be an array');
    assert(recommendations.data.some((r) => r.id === riderAId), 'Expected eligible Karachi rider in recommendations');
    assert(!recommendations.data.some((r) => r.id === riderBId), 'Over-capacity rider should not be recommended');

    const recommendByAddressValidation = await request('/api/riders/recommend', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ zone: 'Karachi' }),
    });
    assert(recommendByAddressValidation.status === 400, 'recommendByAddress should validate required fields');

    const riderBlockedAssign = await request('/api/riders/assign', {
      method: 'POST',
      headers: riderHeaders,
      body: JSON.stringify({ orderId: assignableOrder.id, riderId: riderAId }),
    });
    assert(riderBlockedAssign.status === 403, 'RIDER should not assign riders');

    const assignSuccess = await request('/api/riders/assign', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ orderId: assignableOrder.id, riderId: riderAId }),
    });
    assert(assignSuccess.status === 200, `Assign rider failed: ${JSON.stringify(assignSuccess.data)}`);

    const assignedOrder = await prisma.order.findUnique({ where: { id: assignableOrder.id } });
    assert(assignedOrder?.status === 'READY_FOR_PICKUP', 'Order status should move to READY_FOR_PICKUP after assignment');

    const assignedRider = await prisma.rider.findUnique({ where: { id: riderAId } });
    assert(assignedRider?.currentLoad === 1, 'Assigned rider load should increment');
    assert(Number(assignedRider?.currentWeight || 0) >= 2, 'Assigned rider weight should increment');

    const assignmentRecord = await prisma.riderAssignment.findUnique({ where: { orderId: assignableOrder.id } });
    assert(assignmentRecord && assignmentRecord.riderId === riderAId, 'Assignment record should persist rider mapping');

    const assignOutsideZone = await request('/api/riders/assign', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ orderId: outOfZoneOrder.id, riderId: riderAId }),
    });
    assert(assignOutsideZone.status === 400, 'Assign should fail for rider outside zone');

    const assignCapacityExceeded = await request('/api/riders/assign', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ orderId: heavyOrder.id, riderId: riderBId }),
    });
    assert(assignCapacityExceeded.status === 400, 'Assign should fail when rider exceeds capacity');

    console.log('WF2 independent test passed');
  } finally {
    try {
      if (createdOrderIds.length) {
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdRiderIds.length) {
        await prisma.rider.deleteMany({ where: { id: { in: createdRiderIds } } });
      }
      if (createdUserIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (cleanupError) {
      console.error('WF2 cleanup warning:', cleanupError.message);
    }

    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
};

run().catch(async (error) => {
  console.error(error.message);
  await prisma.$disconnect();
  process.exit(1);
});
