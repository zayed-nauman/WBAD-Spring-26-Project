const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

const PORT = process.env.PORT || 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const APP_FILE = path.join(__dirname, '..', 'src', 'app.js');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getMountedApiBases = () => {
  const source = fs.readFileSync(APP_FILE, 'utf8');
  const regex = /app\.use\(\s*["'](\/api\/[^"']+)["']/g;
  const bases = new Set();
  let match;

  while ((match = regex.exec(source)) !== null) {
    bases.add(match[1]);
  }

  return bases;
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
  const server = app.listen(PORT);

  let riderId;
  let riderToken;
  let orderId;
  let codOrderId;
  let returnCaseId;
  let codReturnCaseId;
  let dispatcherHeaders;
  let adminHeaders;
  let customerHeaders;
  let customerUserId;

  try {
    const mountedApiBases = getMountedApiBases();
    const unique = Date.now();
    const itemName = `Laptop-${unique}`;
    const blacklistedPhone = `03${String(unique).slice(-9)}`;
    const riderPhone = `03${String(unique + 111111111).slice(-9)}`;

    const registerAndLogin = async (role, prefix) => {
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
        }),
      });
      assert(register.status === 200, `Failed to register ${role}: ${JSON.stringify(register.data)}`);

      const login = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert(login.status === 200, `Failed to login ${role}: ${JSON.stringify(login.data)}`);

      const token = login.data?.token;
      const userId = login.data?.user?.id;
      assert(token, `Missing token for ${role}`);
      assert(typeof userId === 'number', `Missing user id for ${role}`);

      return { token, userId };
    };

    const dispatcherAuth = await registerAndLogin('DISPATCHER', 'dispatcher');
    const adminAuth = await registerAndLogin('ADMIN', 'admin');
    const customerAuth = await registerAndLogin('CUSTOMER', 'customer');

    customerUserId = customerAuth.userId;
    dispatcherHeaders = { Authorization: `Bearer ${dispatcherAuth.token}`, 'Content-Type': 'application/json' };
    adminHeaders = { Authorization: `Bearer ${adminAuth.token}`, 'Content-Type': 'application/json' };
    customerHeaders = { Authorization: `Bearer ${customerAuth.token}`, 'Content-Type': 'application/json' };

    const health = await request('/health');
    assert(health.status === 200, 'Health endpoint failed');

    const protectedBases = ['/api/orders', '/api/riders', '/api/blacklist', '/api/return-cases', '/api/inventory'];
    for (const base of protectedBases) {
      if (!mountedApiBases.has(base)) continue;
      const unauth = await request(base);
      assert(unauth.status === 401, `${base} should be protected by auth guard.`);
    }

    const createInventory = await request('/api/inventory', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ productName: itemName, quantity: 5, weightPerUnitKg: 2 }),
    });
    assert([200, 201].includes(createInventory.status), 'Failed to create inventory item');

    const blacklist = await request('/api/blacklist', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ phoneNumber: blacklistedPhone, reason: 'Fraud attempt' }),
    });
    assert([200, 201].includes(blacklist.status), 'Failed to create blacklist entry');

    const createOrder = await request('/api/orders', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        senderName: 'Sender A',
        senderPhone: '03000000000',
        receiverName: 'Receiver A',
        receiverPhone: blacklistedPhone,
        customerName: 'Receiver A',
        phoneNumber: blacklistedPhone,
        address: 'Block 7, Gulshan',
        city: 'Karachi',
        items: itemName,
        weightKg: 2,
        paymentType: 'PREPAID',
        isFragile: true,
      }),
    });
    assert(createOrder.status === 200, `Failed to create order: ${JSON.stringify(createOrder.data)}`);
    orderId = createOrder.data?.order?.id;
    assert(typeof orderId === 'number', 'Order ID missing');
    assert(createOrder.data?.isBlacklisted === true, 'Order should be flagged blacklisted');

    const myOrders = await request('/api/orders/my', { method: 'GET', headers: customerHeaders });
    assert(myOrders.status === 200, 'Customer order history failed');
    assert(Array.isArray(myOrders.data) && myOrders.data.some((o) => o.id === orderId), 'Customer order not present in history');

    const blockedStatus = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'FULFILLMENT' }),
    });
    assert(blockedStatus.status === 409, 'Blacklisted order should require confirmation');

    const fulfillment = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'FULFILLMENT', confirmBlacklisted: true }),
    });
    assert(fulfillment.status === 200, 'Dispatcher should update to FULFILLMENT');

    const labelPrep = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'LABEL_GENERATION', confirmBlacklisted: true }),
    });
    assert(labelPrep.status === 200, 'Dispatcher should set LABEL_GENERATION');

    const labelPdf = await request(`/api/orders/${orderId}/generate-label`, {
      method: 'PUT',
      headers: dispatcherHeaders,
    });
    assert(
      labelPdf.status === 200 && labelPdf.contentType.includes('application/pdf'),
      `Label generation should return PDF. status=${labelPdf.status} contentType=${labelPdf.contentType} body=${JSON.stringify(labelPdf.data)}`,
    );

    const createRider = await request('/api/riders', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({
        name: 'Rider One',
        phone: riderPhone,
        zone: 'Karachi',
        maxLoad: 28,
        maxWeight: 40,
        latitude: 24.914,
        longitude: 67.082,
      }),
    });
    assert(createRider.status === 200, 'Failed to create rider');
    riderId = createRider.data?.rider?.id;
    assert(typeof riderId === 'number', 'Rider ID missing');

    riderToken = jwt.sign({ id: customerUserId + 1000, role: 'RIDER', riderId }, JWT_SECRET, { expiresIn: '1h' });
    const riderHeaders = { Authorization: `Bearer ${riderToken}`, 'Content-Type': 'application/json' };

    const recommendations = await request(`/api/riders/recommend/${orderId}`, {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(recommendations.status === 200, 'Failed to get rider recommendations');
    assert(Array.isArray(recommendations.data), 'Recommendation response must be a list');

    const assign = await request('/api/riders/assign', {
      method: 'POST',
      headers: dispatcherHeaders,
      body: JSON.stringify({ orderId, riderId }),
    });
    assert(assign.status === 200, 'Failed to assign rider');

    const riderPickup = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: riderHeaders,
      body: JSON.stringify({ status: 'PICKUP_IN_PROGRESS', confirmBlacklisted: true }),
    });
    assert(riderPickup.status === 200, 'Assigned rider should set PICKUP_IN_PROGRESS');

    const riderPicked = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: riderHeaders,
      body: JSON.stringify({ status: 'PICKED_UP', confirmBlacklisted: true }),
    });
    assert(riderPicked.status === 200, 'Assigned rider should set PICKED_UP');

    const dispatch = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'SHIPMENT_DISPATCHED', confirmBlacklisted: true }),
    });
    assert(dispatch.status === 200, 'Dispatcher should set SHIPMENT_DISPATCHED');

    const inTransit = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'IN_TRANSIT', confirmBlacklisted: true }),
    });
    assert(inTransit.status === 200, 'Dispatcher should set IN_TRANSIT');

    const outForDelivery = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: riderHeaders,
      body: JSON.stringify({ status: 'OUT_FOR_DELIVERY', confirmBlacklisted: true }),
    });
    assert(outForDelivery.status === 200, 'Rider should set OUT_FOR_DELIVERY');

    const deliveryAttempt = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: riderHeaders,
      body: JSON.stringify({ status: 'DELIVERY_ATTEMPT', confirmBlacklisted: true }),
    });
    assert(deliveryAttempt.status === 200, 'Rider should set DELIVERY_ATTEMPT');

    const failed = await request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: riderHeaders,
      body: JSON.stringify({
        status: 'FAILED',
        confirmBlacklisted: true,
        returnReason: 'Customer unavailable at address',
      }),
    });
    assert(failed.status === 200, 'Failed status update should pass with return reason');

    const listReturnCases = await request('/api/return-cases', {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    assert(listReturnCases.status === 200, 'Return case list failed');
    const createdReturn = listReturnCases.data?.data?.find((rc) => rc.orderId === orderId);
    assert(createdReturn, 'Auto-created return case missing for failed order');
    returnCaseId = createdReturn.id;

    const returnTransitions = [
      ['RETURN_IN_TRANSIT', {}],
      ['RETURNED_RECEIVED', {}],
      ['INSPECTION_DECISION', { inspectionDecision: 'RESELLABLE' }],
      ['REFUND_PROCESS', {}],
      ['REFUND_REQUESTED', {}],
      ['REFUNDED', {}],
      ['RESTOCKED', {}],
    ];

    for (const [status, metadata] of returnTransitions) {
      const transition = await request(`/api/return-cases/${returnCaseId}/transition`, {
        method: 'PATCH',
        headers: dispatcherHeaders,
        body: JSON.stringify({ returnStatus: status, ...metadata }),
      });
      assert(transition.status === 200, `Return transition to ${status} failed`);
    }

    const returnHistory = await request(`/api/return-cases/${returnCaseId}/history`, {
      method: 'GET',
      headers: customerHeaders,
    });
    assert(returnHistory.status === 200, 'Customer should view own return history');
    assert(Array.isArray(returnHistory.data?.data) && returnHistory.data.data.length > 0, 'Return history should have records');

    const codOrder = await request('/api/orders', {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        receiverName: 'Receiver COD',
        receiverPhone: '03009999999',
        customerName: 'Receiver COD',
        phoneNumber: '03009999999',
        address: 'Clifton',
        city: 'Karachi',
        items: itemName,
        paymentType: 'COD',
      }),
    });
    assert(codOrder.status === 200, 'COD order create failed');
    codOrderId = codOrder.data?.order?.id;

    const codToFulfillment = await request(`/api/orders/${codOrderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'FULFILLMENT' }),
    });
    assert(codToFulfillment.status === 200, 'COD order should move to FULFILLMENT before FAILED');

    const codFail = await request(`/api/orders/${codOrderId}/status`, {
      method: 'PUT',
      headers: dispatcherHeaders,
      body: JSON.stringify({ status: 'FAILED', returnReason: 'COD refusal by customer' }),
    });
    assert(codFail.status === 200, 'COD failed status update should pass');

    const returnListAfterCod = await request('/api/return-cases', {
      method: 'GET',
      headers: dispatcherHeaders,
    });
    codReturnCaseId = returnListAfterCod.data?.data?.find((rc) => rc.orderId === codOrderId)?.id;
    assert(codReturnCaseId, 'Auto return case missing for COD failed order');

    const codPath = [
      ['RETURN_IN_TRANSIT', {}],
      ['RETURNED_RECEIVED', {}],
      ['INSPECTION_DECISION', { inspectionDecision: 'RESELLABLE' }],
      ['REFUND_PROCESS', {}],
    ];
    for (const [status, metadata] of codPath) {
      const step = await request(`/api/return-cases/${codReturnCaseId}/transition`, {
        method: 'PATCH',
        headers: dispatcherHeaders,
        body: JSON.stringify({ returnStatus: status, ...metadata }),
      });
      assert(step.status === 200, `COD transition to ${status} failed`);
    }

    const codRefundBlocked = await request(`/api/return-cases/${codReturnCaseId}/transition`, {
      method: 'PATCH',
      headers: dispatcherHeaders,
      body: JSON.stringify({ returnStatus: 'REFUND_REQUESTED' }),
    });
    assert(codRefundBlocked.status === 400, 'COD refund should be blocked before admin approval');

    const codApprove = await request(`/api/return-cases/${codReturnCaseId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ adminApprovedForCod: true }),
    });
    assert(codApprove.status === 200, 'Admin COD approval should succeed');

    const codRefundAllowed = await request(`/api/return-cases/${codReturnCaseId}/transition`, {
      method: 'PATCH',
      headers: dispatcherHeaders,
      body: JSON.stringify({ returnStatus: 'REFUND_REQUESTED' }),
    });
    assert(codRefundAllowed.status === 200, 'COD refund should proceed after approval');

    console.log('CI smoke test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
