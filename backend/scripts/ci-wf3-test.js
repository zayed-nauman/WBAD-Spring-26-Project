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

    const outsiderCustomer = await prisma.user.create({
      data: {
        name: `wf3-outsider-${unique}`,
        email: `wf3.outsider.${unique}@ci.local`,
        password: 'password123',
        role: 'CUSTOMER',
      },
    });
    createdUserIds.push(outsiderCustomer.id);

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

    const damagedOrder = await prisma.order.create({
      data: {
        senderName: 'Sender WF3 Damaged',
        senderPhone: '03004444444',
        receiverName: 'Receiver WF3 Damaged',
        receiverPhone: '03005555555',
        customerName: 'WF3 Customer Damaged',
        phoneNumber: '03005555555',
        address: 'Test Address 3',
        city: 'Karachi',
        items: `WF3-DAMAGED-Item-${unique}`,
        weightKg: 1,
        paymentType: 'PREPAID',
        status: 'FAILED',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(damagedOrder.id);

    const deleteOrder = await prisma.order.create({
      data: {
        senderName: 'Sender WF3 Delete',
        senderPhone: '03006666666',
        receiverName: 'Receiver WF3 Delete',
        receiverPhone: '03007777777',
        customerName: 'WF3 Customer Delete',
        phoneNumber: '03007777777',
        address: 'Test Address 4',
        city: 'Karachi',
        items: `WF3-DELETE-Item-${unique}`,
        weightKg: 1,
        paymentType: 'PREPAID',
        status: 'FAILED',
        createdBy: customer.id,
      },
    });
    createdOrderIds.push(deleteOrder.id);

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
    const outsiderHeaders = {
      Authorization: `Bearer ${jwt.sign({ id: outsiderCustomer.id, role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '1h' })}`,
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

    const invalidJump = await request(`/api/return-cases/${prepaidReturnCaseId}/transition`, {
      method: 'PATCH',
      headers: dispatcherHeaders,
      body: JSON.stringify({ returnStatus: 'REFUNDED' }),
    });
    assert(invalidJump.status === 400, 'Invalid transition jump should be rejected');

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

    const historyHasTransition = prepaidHistory.data.data.some(
      (entry) => entry.action === 'STATUS_TRANSITION' && entry.fromStatus && entry.toStatus,
    );
    assert(historyHasTransition, 'History should include detailed STATUS_TRANSITION records');

    const outsiderBlockedOnCase = await request(`/api/return-cases/${prepaidReturnCaseId}`, {
      method: 'GET',
      headers: outsiderHeaders,
    });
    assert(outsiderBlockedOnCase.status === 403, 'Outsider customer must not read another customer return case');

    const outsiderBlockedOnHistory = await request(`/api/return-cases/${prepaidReturnCaseId}/history`, {
      method: 'GET',
      headers: outsiderHeaders,
    });
    assert(outsiderBlockedOnHistory.status === 403, 'Outsider customer must not read another customer history');

    const customerWrongOwnerCreate = await request('/api/return-cases', {
      method: 'POST',
      headers: outsiderHeaders,
      body: JSON.stringify({
        orderId: prepaidOrder.id,
        customerId: customer.id,
        reason: 'Should fail ownership check',
        paymentType: 'PREPAID',
      }),
    });
    assert(customerWrongOwnerCreate.status === 403, 'Customer should not create return case for another user order');

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

    const codAutoCreateAgain = await request('/api/return-cases/auto-create', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({
        orderId: codOrder.id,
        customerId: customer.id,
        reason: 'COD refused second request',
        paymentType: 'COD',
        orderStatus: 'FAILED',
      }),
    });
    assert(codAutoCreateAgain.status === 200, 'Second auto-create for same order should return existing case');
    assert(codAutoCreateAgain.data?.data?.id === codReturnCaseId, 'Duplicate auto-create should return same case id');

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

    const codHistory = await request(`/api/return-cases/${codReturnCaseId}/history`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(codHistory.status === 200, 'Dispatcher should fetch COD history');
    const hasCodApprovalEntry = codHistory.data?.data?.some((entry) => entry.action === 'COD_REFUND_APPROVED');
    assert(hasCodApprovalEntry, 'COD history should include approval entry');

    const createDamagedCase = await request('/api/return-cases', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        orderId: damagedOrder.id,
        customerId: customer.id,
        reason: 'Item returned damaged',
        paymentType: 'PREPAID',
      }),
    });
    assert(createDamagedCase.status === 201, `Damaged-case create failed: ${JSON.stringify(createDamagedCase.data)}`);

    const damagedReturnCaseId = createDamagedCase.data?.data?.id;
    assert(typeof damagedReturnCaseId === 'number', 'Missing damaged returnCase ID');

    const damagedTransitions = [
      ['RETURN_IN_TRANSIT', {}],
      ['RETURNED_RECEIVED', {}],
      ['INSPECTION_DECISION', { inspectionDecision: 'DAMAGED' }],
    ];

    for (const [status, metadata] of damagedTransitions) {
      const response = await request(`/api/return-cases/${damagedReturnCaseId}/transition`, {
        method: 'PATCH',
        headers: dispatcherHeaders,
        body: JSON.stringify({ returnStatus: status, ...metadata }),
      });
      assert(response.status === 200, `Damaged transition ${status} failed: ${JSON.stringify(response.data)}`);
    }

    const damagedDetail = await request(`/api/return-cases/${damagedReturnCaseId}`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(damagedDetail.status === 200, 'Failed to fetch damaged return case detail');
    assert(
      Array.isArray(damagedDetail.data?.data?.lossRecords) && damagedDetail.data.data.lossRecords.length > 0,
      'DAMAGED flow should create loss record',
    );
    assert(damagedDetail.data?.data?.restocked === false, 'DAMAGED case must not be marked restocked');

    const damagedRestockBlocked = await request(`/api/return-cases/${damagedReturnCaseId}/transition`, {
      method: 'PATCH',
      headers: dispatcherHeaders,
      body: JSON.stringify({ returnStatus: 'RESTOCKED' }),
    });
    assert(damagedRestockBlocked.status === 400, 'DAMAGED case should not be allowed to transition to RESTOCKED');

    const createDeleteCase = await request('/api/return-cases', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        orderId: deleteOrder.id,
        customerId: customer.id,
        reason: 'Delete behavior test',
        paymentType: 'PREPAID',
      }),
    });
    assert(createDeleteCase.status === 201, `Delete-case create failed: ${JSON.stringify(createDeleteCase.data)}`);

    const deleteCaseId = createDeleteCase.data?.data?.id;
    assert(typeof deleteCaseId === 'number', 'Missing delete-test returnCase ID');

    const customerDeleteBlocked = await request(`/api/return-cases/${deleteCaseId}`, {
      method: 'DELETE',
      headers: customerHeaders,
    });
    assert(customerDeleteBlocked.status === 403, 'Customer must not delete return cases');

    const dispatcherDelete = await request(`/api/return-cases/${deleteCaseId}`, {
      method: 'DELETE',
      headers: dispatcherHeaders,
    });
    assert(dispatcherDelete.status === 200, 'Dispatcher should be allowed to delete return case');

    const deletedFetch = await request(`/api/return-cases/${deleteCaseId}`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(deletedFetch.status === 404, 'Deleted return case should not be retrievable');

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
