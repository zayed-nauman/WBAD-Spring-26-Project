const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const DEFAULT_ROLE = 'DISPATCHER';

/**
 * Register a new user account.
 * @param {{name: string, email: string, password: string}} payload
 * @returns {Promise<{id: number}>}
 */
const registerUser = async (payload) => {
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      role: DEFAULT_ROLE,
      riderId: null,
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
    { id: user.id, email: user.email, role: user.role || DEFAULT_ROLE, riderId: user.riderId || null },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, role: user.role || DEFAULT_ROLE, riderId: user.riderId || null },
  };
};

/**
 * Reset an existing user's password.
 * @param {{email: string, password: string}} payload
 * @returns {Promise<boolean>}
 */
const resetPassword = async (payload) => {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.code = 'INVALID_RESET_PAYLOAD';
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.code = 'WEAK_PASSWORD';
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return false;

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  return true;
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
};
