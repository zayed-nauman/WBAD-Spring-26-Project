const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const inventoryController = require('../controllers/inventory.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), inventoryController.listInventory);
router.post('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), inventoryController.createInventory);
router.put('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), inventoryController.updateInventory);
router.delete('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), inventoryController.deleteInventory);

module.exports = router;
