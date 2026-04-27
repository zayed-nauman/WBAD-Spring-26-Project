import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Common/Spinner';
import logo from '../../assets/logo.png';
import './ResetPassword.css';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ error?: string }>(error)) return error.response?.data?.error || fallback;
  return fallback;
};

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await axios.post(`${apiUrl}/api/auth/reset-password`, {
        email,
        password,
      });

      setSuccess('Password reset successfully. Redirecting to login...');
      window.setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page-wrapper">
      <div className="reset-card">
        <div className="reset-logo">
          <img src={logo} alt="ZigZag Delivery" />
        </div>

        <h1>Reset Password</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form className="reset-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="reset-button" disabled={loading}>
            {loading ? <Spinner size={20} color="#fff" /> : 'Reset Password'}
          </button>
        </form>

        <div className="reset-footer">
          <Link to="/">Back to Login</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
