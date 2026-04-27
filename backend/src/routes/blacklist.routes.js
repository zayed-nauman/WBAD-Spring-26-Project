const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const blacklistController = require('../controllers/blacklist.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles(), blacklistController.listBlacklistedNumbers);
router.post('/', authGuard, authorizeRoles(), blacklistController.createBlacklistedNumber);
router.post('/bulk', authGuard, authorizeRoles(), blacklistController.createBlacklistedNumbersBulk);
router.delete('/:id', authGuard, authorizeRoles(), blacklistController.deleteBlacklistedNumber);

module.exports = router;
