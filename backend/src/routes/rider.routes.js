const express = require('express');
const authGuard = require('../services/auth.guard');
const { authorizeRoles } = require('../services/role.guard');
const riderController = require('../controllers/rider.controller');

const router = express.Router();

router.get('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER', 'RIDER'), riderController.listRiders);
router.get('/recommend/:orderId', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), riderController.recommendRiders);
router.post('/recommend', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), riderController.recommendByAddress);
router.post('/', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), riderController.createRider);
router.post('/assign', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), riderController.assignRider);
router.put('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), riderController.updateRider);
router.delete('/:id', authGuard, authorizeRoles('ADMIN', 'DISPATCHER'), riderController.deleteRider);

module.exports = router;