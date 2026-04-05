const authService = require('../services/auth.service');

/**
 * Handle user registration.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const user = await authService.registerUser({ name, email, password, role });
    res.json({ message: 'User registered', userId: user.id });
  } catch (error) {
    if (error && error.code === 'INVALID_ROLE') {
      res.status(400).json({ error: 'Invalid role supplied' });
      return;
    }

    res.status(400).json({ error: 'Email already exists' });
  }
};

/**
 * Handle user login.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const authResult = await authService.loginUser({ email, password });

    if (!authResult) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.json(authResult);
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = {
  register,
  login,
};