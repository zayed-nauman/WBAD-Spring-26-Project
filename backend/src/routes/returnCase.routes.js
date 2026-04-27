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
	authorizeRoles(),
	returnCaseController.listReturnCases,
);
router.post(
	"/auto-create",
	authGuard,
	authorizeRoles(),
	returnCaseController.autoCreateReturnCase,
);
router.post(
	"/validate",
	authGuard,
	authorizeRoles(),
	returnCaseController.validateReturns,
);
router.post(
	"/",
	authGuard,
	authorizeRoles(),
	returnCaseController.createReturnCase,
);

router.get(
	"/:id/history",
	authGuard,
	authorizeRoles(),
	returnCaseController.listReturnCaseHistory,
);
router.get(
	"/:id",
	authGuard,
	authorizeRoles(),
	returnCaseController.getReturnCaseById,
);
router.put(
	"/:id",
	authGuard,
	authorizeRoles(),
	returnCaseController.updateReturnCase,
);
router.patch(
	"/:id/transition",
	authGuard,
	authorizeRoles(),
	returnCaseController.transitionReturnCaseStatus,
);
router.delete(
	"/:id",
	authGuard,
	authorizeRoles(),
	returnCaseController.deleteReturnCase,
);

module.exports = router;
