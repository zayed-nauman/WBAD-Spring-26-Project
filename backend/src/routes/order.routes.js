const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), orderController.listOrders);
router.get('/my', authGuard, authorizeRoles('CUSTOMER'), orderController.listMyOrders);
router.get('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER', 'RIDER', 'CUSTOMER'), orderController.getOrderById);
router.post('/', authGuard, authorizeRoles('CUSTOMER', 'ADMIN', 'DISPATCHER'), orderController.createOrder);
router.put('/:id/status', authGuard, authorizeRoles('ADMIN', 'DISPATCHER', 'RIDER'), orderController.updateOrderStatus);
router.put('/:id/generate-label', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), orderController.generateOrderLabel);
router.delete('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), orderController.deleteOrder);

module.exports = router;