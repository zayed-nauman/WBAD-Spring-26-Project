const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const prisma = require('../src/config/prisma');
const returnCaseRoutes = require('../src/routes/returnCase.routes');

const PORT = process.env.PORT || 3101;
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
  app.use('/api/return-cases', returnCaseRoutes);
  app.get('/health', (req, res) => res.status(200).json({ success: true }));

  const server = app.listen(PORT);

  const createdUserIds = [];
  const createdOrderIds = [];

  try {
    const unique = Date.now();

    const dispatcher = await prisma.user.create({
      data: {
        name: `wf3-dispatcher-${unique}`,
        email: `wf3.dispatcher.${unique}@ci.local`,
        password: 'password123',
        role: 'DISPATCHER',
      },
    });
    createdUserIds.push(dispatcher.id);

    const admin = await prisma.user.create({
      data: {
        name: `wf3-admin-${unique}`,
        email: `wf3.admin.${unique}@ci.local`,
        password: 'password123',
        role: 'ADMIN',
      },
    });
    createdUserIds.push(admin.id);

    const customer = await prisma.user.create({
      data: {
        name: `wf3-customer-${unique}`,
        email: `wf3.customer.${unique}@ci.local`,
        password: 'password123',
        role: 'CUSTOMER',
      },
    });
    createdUserIds.push(customer.id);

    const prepaidOrder = await prisma.order.create({
      data: {
        senderName: 'Sender WF3',
        senderPhone: '03000000000',
        receiverName: 'Receiver WF3',
        receiverPhone: '03001111111',
        customerName: 'WF3 Customer',
        phoneNumber: '03001111111',
        address: 'Test Address 1',
        city: 'Karachi',
        items: `WF3-Item-${unique}`,
        weightKg: 1,
        paymentType: 'PREPAID',
        status: 'FAILED',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(prepaidOrder.id);

    const codOrder = await prisma.order.create({
      data: {
        senderName: 'Sender WF3 COD',
        senderPhone: '03002222222',
        receiverName: 'Receiver WF3 COD',
        receiverPhone: '03003333333',
        customerName: 'WF3 Customer COD',
        phoneNumber: '03003333333',
        address: 'Test Address 2',
        city: 'Karachi',
        items: `WF3-COD-Item-${unique}`,
        weightKg: 1,
        paymentType: 'COD',
        status: 'FAILED',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(codOrder.id);

    const dispatcherHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: dispatcher.id, role: 'DISPATCHER' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };
    const adminHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: admin.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };
    const customerHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: customer.id, role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };
    const riderHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: 999999, role: 'RIDER' }, JWT_SECRET, { expiresIn: '1h' })}`,
      'Content-Type': 'application/json',
    };

    const health = await request('/health');
    assert(health.status === 200, 'WF3 health endpoint failed');

    const riderBlocked = await request('/api/return-cases', {
      method: 'GET',
      headers: riderHeaders,
    });
    assert(riderBlocked.status === 403, 'RIDER must not access return cases');

    const createPrepaidCase = await request('/api/return-cases', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        orderId: prepaidOrder.id,
        customerId: customer.id,
        reason: 'Customer unavailable',
        paymentType: 'PREPAID',
        notes: 'WF3 prepaid case',
      }),
    });
    assert(createPrepaidCase.status === 201, `PREPAID return case create failed: ${JSON.stringify(createPrepaidCase.data)}`);

    const prepaidReturnCaseId = createPrepaidCase.data?.data?.id;
    assert(typeof prepaidReturnCaseId === 'number', 'Missing prepaid returnCase ID');

    const prepaidTransitions = [
      ['RETURN_IN_TRANSIT', {}],
      ['RETURNED_RECEIVED', {}],
      ['INSPECTION_DECISION', { inspectionDecision: 'RESELLABLE' }],
      ['REFUND_PROCESS', {}],
      ['REFUND_REQUESTED', {}],
      ['REFUNDED', {}],
      ['RESTOCKED', {}],
    ];

    for (const [status, metadata] of prepaidTransitions) {
      const response = await request(`/api/return-cases/${prepaidReturnCaseId}/transition`, {
        method: 'PATCH',
        headers: dispatcherHeaders,
        body: JSON.stringify({ returnStatus: status, ...metadata }),
      });
      assert(response.status === 200, `PREPAID transition ${status} failed: ${JSON.stringify(response.data)}`);
    }

    const prepaidDetail = await request(`/api/return-cases/${prepaidReturnCaseId}`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(prepaidDetail.status === 200, 'Failed to fetch prepaid return case detail');
    assert(prepaidDetail.data?.data?.returnStatus === 'RESTOCKED', 'PREPAID return case should end at RESTOCKED');
    assert(
      Array.isArray(prepaidDetail.data?.data?.inventoryAdjustments) && prepaidDetail.data.data.inventoryAdjustments.length > 0,
      'PREPAID restock should create inventory adjustment',
    );

    const prepaidHistory = await request(`/api/return-cases/${prepaidReturnCaseId}/history`, {
      method: 'GET',
      headers: customerHeaders,
    });
    assert(prepaidHistory.status === 200, 'Customer should access own return history');
    assert(Array.isArray(prepaidHistory.data?.data) && prepaidHistory.data.data.length > 0, 'History should contain records');

    const createCodCase = await request('/api/return-cases/auto-create', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({
        orderId: codOrder.id,
        customerId: customer.id,
        reason: 'COD refused',
        paymentType: 'COD',
        orderStatus: 'FAILED',
      }),
    });
    assert([200, 201].includes(createCodCase.status), `COD auto-create failed: ${JSON.stringify(createCodCase.data)}`);

    const codReturnCaseId = createCodCase.data?.data?.id;
    assert(typeof codReturnCaseId === 'number', 'Missing COD returnCase ID');

    const codTransitions = [
      ['RETURN_IN_TRANSIT', {}],
      ['RETURNED_RECEIVED', {}],
      ['INSPECTION_DECISION', { inspectionDecision: 'RESELLABLE' }],
      ['REFUND_PROCESS', {}],
    ];

    for (const [status, metadata] of codTransitions) {
      const response = await request(`/api/return-cases/${codReturnCaseId}/transition`, {
        method: 'PATCH',
        headers: dispatcherHeaders,
        body: JSON.stringify({ returnStatus: status, ...metadata }),
      });
      assert(response.status === 200, `COD transition ${status} failed: ${JSON.stringify(response.data)}`);
    }

    const codRefundBlocked = await request(`/api/return-cases/${codReturnCaseId}/transition`, {
      method: 'PATCH',
      headers: dispatcherHeaders,
      body: JSON.stringify({ returnStatus: 'REFUND_REQUESTED' }),
    });
    assert(codRefundBlocked.status === 400, 'COD refund should be blocked before admin approval');

    const codApproved = await request(`/api/return-cases/${codReturnCaseId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ adminApprovedForCod: true }),
    });
    assert(codApproved.status === 200, 'Admin approval should succeed for COD return case');

    const codRefundAllowed = await request(`/api/return-cases/${codReturnCaseId}/transition`, {
      method: 'PATCH',
      headers: dispatcherHeaders,
      body: JSON.stringify({ returnStatus: 'REFUND_REQUESTED' }),
    });
    assert(codRefundAllowed.status === 200, 'COD refund should proceed after admin approval');

    console.log('WF3 independent test passed');
  } finally {
    try {
      if (createdOrderIds.length) {
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdUserIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (cleanupError) {
      console.error('WF3 cleanup warning:', cleanupError.message);
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
