const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const riderController = require('../controllers/rider.controller');

const router = express.Router();
const dispatcherAccess = authorizeRoles();

router.get('/', authGuard, dispatcherAccess, riderController.listRiders);
router.get('/next-number', authGuard, dispatcherAccess, riderController.getNextRiderNumber);
router.get('/ready-orders', authGuard, dispatcherAccess, riderController.listReadyOrders);
router.get('/assigned-orders', authGuard, dispatcherAccess, riderController.listAssignedOrders);
router.get('/assigned-orders/:orderId', authGuard, dispatcherAccess, riderController.getAssignedOrder);
router.get('/recommendations/:orderId', authGuard, dispatcherAccess, riderController.recommendRiders);
router.get('/recommend/:orderId', authGuard, dispatcherAccess, riderController.recommendRiders);
router.post('/recommend', authGuard, dispatcherAccess, riderController.recommendByAddress);
router.post('/', authGuard, dispatcherAccess, riderController.createRider);
router.post('/assign', authGuard, dispatcherAccess, riderController.assignRider);
router.get('/:id', authGuard, dispatcherAccess, riderController.getRiderById);
router.put('/:id', authGuard, dispatcherAccess, riderController.updateRider);
router.delete('/:id', authGuard, dispatcherAccess, riderController.deleteRider);

module.exports = router;
