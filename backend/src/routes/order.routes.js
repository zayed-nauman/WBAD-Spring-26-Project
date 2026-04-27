const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles(), orderController.listOrders);
router.get('/my', authGuard, authorizeRoles(), orderController.listMyOrders);
router.get('/next-number', authGuard, authorizeRoles(), orderController.getNextOrderNumber);
router.get('/:id', authGuard, authorizeRoles(), orderController.getOrderById);
router.post('/', authGuard, authorizeRoles(), orderController.createOrder);
router.put('/:id', authGuard, authorizeRoles(), orderController.updateOrder);
router.patch('/:id/status', authGuard, authorizeRoles(), orderController.updateOrderStatus);
router.put('/:id/status', authGuard, authorizeRoles(), orderController.updateOrderStatus);
router.put('/:id/generate-label', authGuard, authorizeRoles(), orderController.generateOrderLabel);
router.delete('/:id', authGuard, authorizeRoles(), orderController.deleteOrder);

module.exports = router;
