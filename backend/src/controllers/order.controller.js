const orderService = require('../services/order.service');

/**
 * Parse numeric ID route param.
 * @param {string} rawId
 * @returns {number}
 */
const parseId = (rawId) => Number.parseInt(rawId, 10);

const listOrders = async (req, res) => {
  try {
    const orders = await orderService.listOrders(req.query, req.user);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getNextOrderNumber = async (req, res) => {
  try {
    const orderNumber = await orderService.nextTrackingNumber();
    res.json({ orderNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate order number' });
  }
};

const listMyOrders = async (req, res) => {
  try {
    const orders = await orderService.listOrdersByUser(req.user.id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(parseId(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const createOrder = async (req, res) => {
  const {
    senderName,
    senderPhone,
    receiverName,
    receiverPhone,
    customerName,
    phoneNumber,
    address,
    city,
    weightKg,
    codAmount,
    paymentType,
    isFragile,
  } = req.body;

  try {
    const result = await orderService.createOrder(
      {
        senderName,
        senderPhone,
        recipientName: req.body.recipientName,
        receiverName,
        receiverPhone,
        customerName,
        phoneNumber,
        address,
        city,
        weightKg,
        numberOfPieces: req.body.numberOfPieces,
        codAmount,
        paymentType,
        amount: req.body.amount,
        isFragile,
        fragile: req.body.fragile,
        date: req.body.date,
        orderNumber: req.body.orderNumber,
      },
      req.user.id
    );

    res.json({ message: 'Order created', order: result.order, isBlacklisted: result.isBlacklisted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const order = await orderService.updateOrder(parseId(req.params.id), req.body, req.user);
    res.json({ message: 'Order updated', order });
  } catch (error) {
    if (error && error.code === 'ORDER_BLACKLISTED') {
      res.status(409).json({ error: error.message });
      return;
    }

    if (error && error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update order' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status, confirmBlacklisted, returnReason, statusContext } = req.body;

  try {
    const order = await orderService.updateOrderStatus(parseId(req.params.id), status, req.user, {
      confirmBlacklisted: Boolean(confirmBlacklisted),
      returnReason,
      statusContext,
    });
    res.json({ message: 'Status updated', order });
  } catch (error) {
    if (error && error.code === 'ORDER_BLACKLISTED') {
      res.status(409).json({ error: 'Order is blacklisted. Confirm before proceeding.' });
      return;
    }

    if (error && error.code === 'RETURN_REASON_REQUIRED') {
      res.status(400).json({ error: error.message });
      return;
    }

    if (error && error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update status' });
  }
};

const generateOrderLabel = async (req, res) => {
  try {
    const result = await orderService.generateOrderLabel(parseId(req.params.id), req.user);
    // stream PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
    res.send(result.pdfBuffer);
  } catch (error) {
    if (error && error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to generate label' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await orderService.deleteOrder(parseId(req.params.id), req.user);
    res.json({ message: 'Order deleted' });
  } catch (error) {
    if (error && error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete order' });
  }
};

module.exports = {
  listOrders,
  listMyOrders,
  getNextOrderNumber,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  generateOrderLabel,
  deleteOrder,
};
