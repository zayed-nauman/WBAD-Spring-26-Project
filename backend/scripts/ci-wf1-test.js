const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const prisma = require('../src/config/prisma');
const authRoutes = require('../src/routes/auth.routes');
const orderRoutes = require('../src/routes/order.routes');
const inventoryRoutes = require('../src/routes/inventory.routes');
const blacklistRoutes = require('../src/routes/blacklist.routes');

const PORT = process.env.PORT || 3103;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (targetPath, options = {}) => {
  const response = await fetch(`${BASE_URL}${targetPath}`, options);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/pdf')) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, data: buffer, contentType };
  }

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { status: response.status, data, contentType };
};

const run = async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/blacklist', blacklistRoutes);
  app.get('/health', (req, res) => res.status(200).json({ success: true }));

  const server = app.listen(PORT);

  const createdUserIds = [];
  const createdOrderIds = [];
  const createdRiderIds = [];
  const createdInventoryIds = [];
  const createdBlacklistIds = [];

  try {
    const unique = Date.now();

    const registerAndLogin = async (role, prefix, extra = {}) => {
      const email = `${prefix}.${unique}@ci.local`;
      const password = 'password123';

      const register = await request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${prefix}-${unique}`,
          email,
          password,
          role,
          ...extra,
        }),
      });
      assert(register.status === 200, `Failed to register ${role}: ${JSON.stringify(register.data)}`);
      createdUserIds.push(register.data?.userId);

      const login = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert(login.status === 200, `Failed to login ${role}: ${JSON.stringify(login.data)}`);

      return {
        token: login.data?.token,
        userId: login.data?.user?.id,
      };
    };

    const dispatcherAuth = await registerAndLogin('DISPATCHER', 'wf1-dispatcher');
    const customerAuth = await registerAndLogin('CUSTOMER', 'wf1-customer');
    const otherCustomerAuth = await registerAndLogin('CUSTOMER', 'wf1-customer-other');

    assert(dispatcherAuth.token, 'Dispatcher token missing');
    assert(customerAuth.token, 'Customer token missing');

    const dispatcherHeaders = {
      Authorization: `Bearer ${dispatcherAuth.token}`,
      'Content-Type': 'application/json',
    };

    const customerHeaders = {
      Authorization: `Bearer ${customerAuth.token}`,
      'Content-Type': 'application/json',
    };

    const otherCustomerHeaders = {
      Authorization: `Bearer ${otherCustomerAuth.token}`,
      'Content-Type': 'application/json',
    };

    const health = await request('/health');
    assert(health.status === 200, 'Health endpoint failed');

    const protectedBases = ['/api/orders', '/api/inventory', '/api/blacklist'];
    for (const base of protectedBases) {
      const unauth = await request(base);
      assert(unauth.status === 401, `${base} should be auth-protected`);
    }

    const createInventory = await request('/api/inventory', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ productName: `WF1-Laptop-${unique}`, quantity: 3, sku: `WF1-SKU-${unique}` }),
    });
    assert(createInventory.status === 200, `Failed to create inventory: ${JSON.stringify(createInventory.data)}`);
    const inventoryId = createInventory.data?.item?.id;
    assert(typeof inventoryId === 'number', 'Inventory ID missing');
    createdInventoryIds.push(inventoryId);

    const customerCannotCreateInventory = await request('/api/inventory', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({ productName: `WF1-Blocked-${unique}`, quantity: 1 }),
    });
    assert(customerCannotCreateInventory.status === 403, 'Customer should not create inventory');

    const blacklistedPhone = `03${String(unique).slice(-9)}`;
    const blacklist = await request('/api/blacklist', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ phoneNumber: blacklistedPhone, reason: 'WF1 blacklist test' }),
    });
    assert(blacklist.status === 200, `Failed to create blacklist entry: ${JSON.stringify(blacklist.data)}`);
    const blacklistId = blacklist.data?.entry?.id;
    assert(typeof blacklistId === 'number', 'Blacklist ID missing');
    createdBlacklistIds.push(blacklistId);

    const createOrder = await request('/api/orders', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        senderName: 'WF1 Sender',
        senderPhone: '03000000000',
        receiverName: 'WF1 Receiver',
        receiverPhone: blacklistedPhone,
        customerName: 'WF1 Receiver',
        phoneNumber: blacklistedPhone,
        address: 'Gulshan Block 7',
        city: 'Karachi',
        items: `WF1-Laptop-${unique}`,
        weightKg: 2,
        paymentType: 'PREPAID',
        isFragile: true,
      }),
    });

    assert(createOrder.status === 200, `Failed to create order: ${JSON.stringify(createOrder.data)}`);
    const orderId = createOrder.data?.order?.id;
    assert(typeof orderId === 'number', 'Order ID missing');
    createdOrderIds.push(orderId);
    assert(createOrder.data?.isBlacklisted === true, 'Order should be flagged blacklisted');

    const myOrders = await request('/api/orders/my', {
      method: 'GET',
      headers: customerHeaders,
    });
    assert(myOrders.status === 200, 'Customer my orders failed');
    assert(Array.isArray(myOrders.data) && myOrders.data.some((o) => o.id === orderId), 'Created order missing in /my');

    const otherCustomerForbidden = await request(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: otherCustomerHeaders,
    });
    assert(otherCustomerForbidden.status === 403, 'Different customer should not access this order');

    const blockedFulfillment = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'FULFILLMENT' }),
    });
    assert(blockedFulfillment.status === 409, 'Blacklisted order should block fulfillment without confirmation');

    const fulfillment = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'FULFILLMENT', confirmBlacklisted: true }),
    });
    assert(fulfillment.status === 200, `FULFILLMENT failed: ${JSON.stringify(fulfillment.data)}`);
    assert(fulfillment.data?.order?.fulfillmentResult === 'FULFILLED', 'Order should be fulfilled with inventory present');

    const labelPrep = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'LABEL_GENERATION', confirmBlacklisted: true }),
    });
    assert(labelPrep.status === 200, 'LABEL_GENERATION transition failed');

    const labelPdf = await request(`/api/orders/${orderId}/generate-label`, {
      method: 'PUT',
      headers: dispatcherHeaders,
    });
    assert(
      labelPdf.status === 200 && labelPdf.contentType.includes('application/pdf') && labelPdf.data.length > 0,
      `Label PDF should be generated. status=${labelPdf.status}`,
    );

    const rider = await prisma.rider.create({
      data: {
        name: `WF1 Rider ${unique}`,
        phone: `03${String(unique + 111111111).slice(-9)}`,
        zone: 'Karachi',
      },
    });
    createdRiderIds.push(rider.id);

    const outsiderRiderToken = jwt.sign(
      { id: 999001, role: 'RIDER', riderId: rider.id + 999 },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const outsiderRiderHeaders = {
      Authorization: `Bearer ${outsiderRiderToken}`,
      'Content-Type': 'application/json',
    };

    const riderNotAssigned = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: outsiderRiderHeaders,
      body: JSON.stringify({ status: 'PICKUP_IN_PROGRESS', confirmBlacklisted: true }),
    });
    assert(riderNotAssigned.status === 403, 'Unassigned rider must not update order');

    await prisma.riderAssignment.create({
      data: {
        orderId,
        riderId: rider.id,
        status: 'ASSIGNED',
      },
    });

    const assignedRiderToken = jwt.sign(
      { id: 999002, role: 'RIDER', riderId: rider.id },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    const assignedRiderHeaders = {
      Authorization: `Bearer ${assignedRiderToken}`,
      'Content-Type': 'application/json',
    };

    const riderPickup = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: assignedRiderHeaders,
      body: JSON.stringify({ status: 'PICKUP_IN_PROGRESS', confirmBlacklisted: true }),
    });
    assert(riderPickup.status === 200, 'Assigned rider should set PICKUP_IN_PROGRESS');

    const riderPicked = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: assignedRiderHeaders,
      body: JSON.stringify({ status: 'PICKED_UP', confirmBlacklisted: true }),
    });
    assert(riderPicked.status === 200, 'Assigned rider should set PICKED_UP');

    const invalidJump = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'DELIVERED', confirmBlacklisted: true }),
    });
    assert(invalidJump.status === 400, 'Invalid status transition should fail');

    const dispatched = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'SHIPMENT_DISPATCHED', confirmBlacklisted: true }),
    });
    assert(dispatched.status === 200, 'Dispatcher should set SHIPMENT_DISPATCHED');

    const inTransit = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'IN_TRANSIT', confirmBlacklisted: true }),
    });
    assert(inTransit.status === 200, 'Dispatcher should set IN_TRANSIT');

    const outForDelivery = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: assignedRiderHeaders,
      body: JSON.stringify({ status: 'OUT_FOR_DELIVERY', confirmBlacklisted: true }),
    });
    assert(outForDelivery.status === 200, 'Rider should set OUT_FOR_DELIVERY');

    const deliveryAttempt = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: assignedRiderHeaders,
      body: JSON.stringify({ status: 'DELIVERY_ATTEMPT', confirmBlacklisted: true }),
    });
    assert(deliveryAttempt.status === 200, 'Rider should set DELIVERY_ATTEMPT');

    const failedWithoutReason = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: assignedRiderHeaders,
      body: JSON.stringify({ status: 'FAILED', confirmBlacklisted: true }),
    });
    assert(failedWithoutReason.status === 400, 'FAILED must require returnReason');

    const failedWithReason = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: assignedRiderHeaders,
      body: JSON.stringify({
        status: 'FAILED',
        confirmBlacklisted: true,
        returnReason: 'Customer unavailable',
      }),
    });
    assert(failedWithReason.status === 200, 'FAILED with reason should pass');

    const failedOrder = await prisma.order.findUnique({ where: { id: orderId }, include: { returnCase: true } });
    assert(failedOrder?.returnCase?.reason, 'Failed order should upsert a return case reason');

    const deleteOrder = await request(`/api/orders/${orderId}`, {
      method: 'DELETE',
      headers: dispatcherHeaders,
    });
    assert(deleteOrder.status === 200, 'Dispatcher should delete order');

    createdOrderIds.splice(createdOrderIds.indexOf(orderId), 1);

    const afterDelete = await request(`/api/orders/${orderId}`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(afterDelete.status === 404, 'Deleted order should not be found');

    console.log('WF1 independent test passed');
  } finally {
    try {
      if (createdBlacklistIds.length) {
        await prisma.blacklistedNumber.deleteMany({ where: { id: { in: createdBlacklistIds } } });
      }
      if (createdOrderIds.length) {
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdInventoryIds.length) {
        await prisma.inventory.deleteMany({ where: { id: { in: createdInventoryIds } } });
      }
      if (createdRiderIds.length) {
        await prisma.rider.deleteMany({ where: { id: { in: createdRiderIds } } });
      }
      if (createdUserIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds.filter(Boolean) } } });
      }
    } catch (cleanupError) {
      console.error('WF1 cleanup warning:', cleanupError.message);
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
