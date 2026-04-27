const returnCaseService = require("../services/returnCase.service");

/**
 * Parse and validate a numeric ID from route params.
 * @param {string} rawId
 * @returns {number|null}
 */
const parseId = (rawId) => {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Send a standardized error response.
 * @param {import("express").Response} res
 * @param {Error & {statusCode?: number}} error
 * @param {string} fallbackMessage
 * @returns {void}
 */
const sendError = (res, error, fallbackMessage) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: fallbackMessage,
    error: error.message,
  });
};

/**
 * GET /api/return-cases
 * Return all return cases.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const listReturnCases = async (req, res) => {
  try {
    const data = await returnCaseService.listReturnCases(req.user);

    res.status(200).json({
      success: true,
      message: "Return cases fetched successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to fetch return cases.");
  }
};

/**
 * GET /api/return-cases/:id
 * Return one return case by ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getReturnCaseById = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid return case ID.",
    });
    return;
  }

  try {
    const data = await returnCaseService.getReturnCaseById(id, req.user);

    if (!data) {
      res.status(404).json({
        success: false,
        message: "Return case not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Return case fetched successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to fetch return case.");
  }
};

/**
 * POST /api/return-cases
 * Create a new return case.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const createReturnCase = async (req, res) => {
  const { orderId, customerId, reason, refundAmount, notes, returnedItems } = req.body;

  if (!orderId || !customerId || !reason) {
    res.status(400).json({
      success: false,
      message: "orderId, customerId, and reason are required.",
    });
    return;
  }

  try {
    const data = await returnCaseService.createReturnCase({
      orderId,
      customerId,
      reason,
      refundAmount,
      notes,
      returnedItems,
    }, req.user);

    res.status(201).json({
      success: true,
      message: "Return case created successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to create return case.");
  }
};

/**
 * POST /api/return-cases/auto-create
 * Auto-create return case when order reaches Failed/Returned.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const autoCreateReturnCase = async (req, res) => {
  const { orderId, customerId, reason, orderStatus, refundAmount, notes } = req.body;

  if (!orderId || !customerId || !reason || !orderStatus) {
    res.status(400).json({
      success: false,
      message: "orderId, customerId, reason, and orderStatus are required.",
    });
    return;
  }

  try {
    const data = await returnCaseService.autoCreateReturnCaseFromOrderEvent({
      orderId,
      customerId,
      reason,
      orderStatus,
      refundAmount,
      notes,
    }, req.user);

    res.status(data.autoCreated ? 201 : 200).json({
      success: true,
      message: data.autoCreated
        ? "Return case auto-created from order status event."
        : "Return case already exists for this order.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to auto-create return case.");
  }
};

/**
 * PUT /api/return-cases/:id
 * Update a return case by ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const updateReturnCase = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid return case ID.",
    });
    return;
  }

  try {
    const data = await returnCaseService.updateReturnCase(id, req.body, req.user);

    res.status(200).json({
      success: true,
      message: "Return case updated successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to update return case.");
  }
};

/**
 * PATCH /api/return-cases/:id/transition
 * Move return case to next/selected lifecycle stage.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const transitionReturnCaseStatus = async (req, res) => {
  const id = parseId(req.params.id);
  const { returnStatus, ...metadata } = req.body;

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid return case ID.",
    });
    return;
  }

  if (!returnStatus) {
    res.status(400).json({
      success: false,
      message: "returnStatus is required.",
    });
    return;
  }

  try {
    const data = await returnCaseService.transitionReturnCaseStatus(id, returnStatus, metadata, req.user);

    res.status(200).json({
      success: true,
      message: "Return case transitioned successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to transition return case.");
  }
};

/**
 * GET /api/return-cases/:id/history
 * Return lifecycle/refund history for one return case.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const listReturnCaseHistory = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid return case ID.",
    });
    return;
  }

  try {
    const data = await returnCaseService.listReturnCaseHistory(id, req.user);

    res.status(200).json({
      success: true,
      message: "Return case history fetched successfully.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Failed to fetch return case history.");
  }
};

/**
 * DELETE /api/return-cases/:id
 * Delete a return case by ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const deleteReturnCase = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid return case ID.",
    });
    return;
  }

  try {
    await returnCaseService.deleteReturnCase(id, req.user);

    res.status(200).json({
      success: true,
      message: "Return case deleted successfully.",
    });
  } catch (error) {
    sendError(res, error, "Failed to delete return case.");
  }
};

/**
 * POST /api/return-cases/validate
 * Validate multiple order identifiers.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const validateReturns = async (req, res) => {
  const { orderNumbers } = req.body;

  if (!orderNumbers) {
    res.status(400).json({
      success: false,
      message: "orderNumbers (comma-separated) is required.",
    });
    return;
  }

  try {
    const result = await returnCaseService.validateReturnOrders(orderNumbers, req.user);

    res.status(200).json({
      success: true,
      message: result.success ? "All orders validated successfully." : "Some orders failed validation.",
      data: result,
    });
  } catch (error) {
    sendError(res, error, "Failed to validate return orders.");
  }
};

module.exports = {
  listReturnCases,
  getReturnCaseById,
  createReturnCase,
  autoCreateReturnCase,
  updateReturnCase,
  transitionReturnCaseStatus,
  listReturnCaseHistory,
  deleteReturnCase,
  validateReturns,
};
