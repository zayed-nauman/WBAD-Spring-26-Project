const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const blacklistController = require('../controllers/blacklist.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), blacklistController.listBlacklistedNumbers);
router.post('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), blacklistController.createBlacklistedNumber);
router.delete('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), blacklistController.deleteBlacklistedNumber);

module.exports = router;