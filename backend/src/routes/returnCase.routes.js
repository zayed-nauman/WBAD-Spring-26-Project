const express = require("express");
const returnCaseController = require("../controllers/returnCase.controller");
const authGuard = require("../services/auth.guard");
const { authorizeRoles } = require("../services/role.guard");

const router = express.Router();

/**
 * Return case CRUD routes.
 */
router.get(
	"/",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER", "CUSTOMER"),
	returnCaseController.listReturnCases,
);
router.post(
	"/auto-create",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER"),
	returnCaseController.autoCreateReturnCase,
);
router.post(
	"/",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER", "CUSTOMER"),
	returnCaseController.createReturnCase,
);
router.get(
	"/:id/history",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER", "CUSTOMER"),
	returnCaseController.listReturnCaseHistory,
);
router.get(
	"/:id",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER", "CUSTOMER"),
	returnCaseController.getReturnCaseById,
);
router.put(
	"/:id",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER"),
	returnCaseController.updateReturnCase,
);
router.patch(
	"/:id/transition",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER"),
	returnCaseController.transitionReturnCaseStatus,
);
router.delete(
	"/:id",
	authGuard,
	authorizeRoles("ADMIN", "DISPATCHER"),
	returnCaseController.deleteReturnCase,
);

module.exports = router;
