const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const ALLOWED_ROLES = new Set(['ADMIN', 'DISPATCHER', 'RIDER', 'CUSTOMER']);
const normalizeRole = (role) => String(role || 'CUSTOMER').trim().toUpperCase();

/**
 * Register a new user account.
 * @param {{name: string, email: string, password: string, role?: string}} payload
 * @returns {Promise<{id: number}>}
 */
const registerUser = async (payload) => {
  const role = normalizeRole(payload.role);
  if (!ALLOWED_ROLES.has(role)) {
    const error = new Error('Invalid role');
    error.code = 'INVALID_ROLE';
    throw error;
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      role,
      riderId: payload.riderId || null,
    },
    select: { id: true },
  });
};

/**
 * Authenticate a user and issue a JWT token.
 * @param {{email: string, password: string}} payload
 * @returns {Promise<{token: string, user: {id: number, name: string, role: string}}|null>}
 */
const loginUser = async (payload) => {
  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) return null;

  const valid = await bcrypt.compare(payload.password, user.password);
  if (!valid) return null;

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, riderId: user.riderId || null },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, role: user.role, riderId: user.riderId || null },
  };
};

module.exports = {
  registerUser,
  loginUser,
};