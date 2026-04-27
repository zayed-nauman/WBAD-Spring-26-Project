const riderService = require('../services/rider.service');
const recommendationService = require('../services/recommendation.service');

const parseId = (rawId) => Number.parseInt(rawId, 10);

const handleError = (res, error, fallback) => {
  if (error && error.statusCode) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error && error.code === 'P2002') {
    res.status(409).json({ error: 'A rider with this phone number or rider number already exists.' });
    return;
  }

  if (error && error.code === 'P2025') {
    res.status(404).json({ error: 'Rider not found.' });
    return;
  }

  console.error(fallback, error);
  res.status(500).json({ error: fallback });
};

const listRiders = async (req, res) => {
  try {
    const riders = await riderService.listRiders(req.query);
    res.json(riders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch riders');
  }
};

const getRiderById = async (req, res) => {
  try {
    const rider = await riderService.getRiderById(parseId(req.params.id));
    if (!rider) {
      res.status(404).json({ error: 'Rider not found' });
      return;
    }
    res.json(rider);
  } catch (error) {
    handleError(res, error, 'Failed to fetch rider');
  }
};

const getNextRiderNumber = async (req, res) => {
  try {
    res.json({ riderNumber: await riderService.nextRiderNumber() });
  } catch (error) {
    handleError(res, error, 'Failed to generate rider number');
  }
};

const listReadyOrders = async (req, res) => {
  try {
    const orders = await riderService.listReadyOrders(req.query);
    res.json(orders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch ready orders');
  }
};

const listAssignedOrders = async (req, res) => {
  try {
    const orders = await riderService.listAssignedOrders(req.query);
    res.json(orders);
  } catch (error) {
    handleError(res, error, 'Failed to fetch assigned orders');
  }
};

const getAssignedOrder = async (req, res) => {
  try {
    const order = await riderService.getAssignedOrder(parseId(req.params.orderId));
    if (!order) {
      res.status(404).json({ error: 'Assigned order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    handleError(res, error, 'Failed to fetch assigned order');
  }
};

const recommendRiders = async (req, res) => {
  try {
    const recommendations = await riderService.recommendRiders(parseId(req.params.orderId));

    if (!recommendations) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(recommendations);
  } catch (error) {
    handleError(res, error, 'Failed to get recommendations');
  }
};

const recommendByAddress = async (req, res) => {
  try {
    const { deliveryAddress, zone } = req.body;
    if (!deliveryAddress || !zone) {
      res.status(400).json({ error: 'deliveryAddress and zone are required' });
      return;
    }

    const result = await recommendationService.recommendRidersForDestination(deliveryAddress, zone);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to get recommendations' });
  }
};

const createRider = async (req, res) => {
  try {
    const rider = await riderService.createRider(req.body);
    res.json({ message: 'Rider created', rider });
  } catch (error) {
    handleError(res, error, 'Failed to create rider');
  }
};

const assignRider = async (req, res) => {
  const { orderId, riderId } = req.body;

  try {
    const result = await riderService.assignRider(orderId, riderId);
    res.json({ message: 'Rider assigned', ...result });
  } catch (error) {
    handleError(res, error, 'Failed to assign rider');
  }
};

const updateRider = async (req, res) => {
  try {
    const rider = await riderService.updateRider(parseId(req.params.id), req.body);
    res.json({ message: 'Rider updated', rider });
  } catch (error) {
    handleError(res, error, 'Failed to update rider');
  }
};

const deleteRider = async (req, res) => {
  try {
    await riderService.deleteRider(parseId(req.params.id));
    res.json({ message: 'Rider deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete rider');
  }
};

module.exports = {
  listRiders,
  getRiderById,
  getNextRiderNumber,
  listReadyOrders,
  listAssignedOrders,
  getAssignedOrder,
  recommendRiders,
  recommendByAddress,
  createRider,
  assignRider,
  updateRider,
  deleteRider,
};
