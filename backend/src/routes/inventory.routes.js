const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const inventoryController = require('../controllers/inventory.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles(), inventoryController.listInventory);
router.post('/', authGuard, authorizeRoles(), inventoryController.createInventory);
router.put('/:id', authGuard, authorizeRoles(), inventoryController.updateInventory);
router.delete('/:id', authGuard, authorizeRoles(), inventoryController.deleteInventory);

module.exports = router;
