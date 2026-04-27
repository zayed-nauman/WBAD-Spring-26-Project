import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Common/Spinner';
import './Signup.css';

import logo from '../../assets/logo.png';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    day: '',
    month: '',
    year: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.post(`${apiUrl}/api/auth/register`, {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
      });


      console.log('Registration successful:', response.data);
      navigate('/');
    } catch (err: any) {

      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-card">
        <img src={logo} alt="ZigZag Logo" className="brand-logo" />
        
        <div className="signup-header">
          <h1>Get Started on ZigZag</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="field-container">
            <label>Name</label>
            <div className="form-row">
              <div className="input-group">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  onChange={handleChange}
                  required
                />
                <User size={16} className="icon" />
              </div>
              <div className="input-group">
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  onChange={handleChange}
                  required
                />
                <User size={16} className="icon" />
              </div>
            </div>
          </div>

          <div className="field-container">
            <label>Date of Birth</label>
            <div className="input-group">
              <input 
                type="date" 
                name="dob" 
                onChange={handleChange}
                required
              />
            </div>
          </div>


          <div className="form-row">
            <div className="field-container">
              <label>Gender</label>
              <div className="input-group">
                <select name="gender" onChange={handleChange} defaultValue="">
                  <option value="" disabled>Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="field-container">
              <label>Email Address</label>
              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

          </div>

          <div className="field-container">
            <label>Password</label>
            <div className="input-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <Lock size={16} className="icon" />
            </div>
          </div>

          <div className="field-container">
            <label>Confirm Password</label>
            <div className="input-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <Lock size={16} className="icon" />
            </div>
          </div>

          <div className="signup-button-container">
            <button type="submit" className="signup-button" disabled={loading}>
              {loading ? <Spinner size={20} /> : 'Sign Up'}
            </button>

            <div className="login-link-container">
              <Link to="/" className="login-link">I already have an account</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
