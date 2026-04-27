const authService = require('../services/auth.service');

/**
 * Handle user registration.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await authService.registerUser({ name, email, password });
    res.json({ message: 'User registered', userId: user.id });
  } catch (error) {
    console.error('Registration Error:', error);

    res.status(400).json({ error: error.message || 'Registration failed' });
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
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

/**
 * Handle password reset.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const reset = await authService.resetPassword({ email, password });

    if (!reset) {
      res.status(404).json({ error: 'No account found for that email' });
      return;
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);

    if (error && ['INVALID_RESET_PAYLOAD', 'WEAK_PASSWORD'].includes(error.code)) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  register,
  login,
  resetPassword,
};
