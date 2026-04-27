const normalizeRole = () => "DISPATCHER";

const authorizeRoles = () => (req, res, next) => next();

module.exports = {
  authorizeRoles,
  normalizeRole,
};
