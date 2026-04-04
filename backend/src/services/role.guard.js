const normalizeRole = (role) => String(role || "").trim().toUpperCase();

const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);

    if (!role) {
      res.status(403).json({
        success: false,
        message: "Access denied. Role not found in token.",
      });
      return;
    }

    if (!normalizedAllowed.includes(role)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Insufficient role permissions.",
      });
      return;
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
  normalizeRole,
};