import React, { useState } from 'react';
import axios from 'axios';
import './Returns.css';
import Spinner from '../Common/Spinner';

const Returns: React.FC = () => {
  const [orderNumbers, setOrderNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!orderNumbers.trim()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${apiUrl}/api/return-cases/validate`, 
        { orderNumbers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { data } = response.data;

      if (data.success) {
        setSuccess('All orders validated! Proceeding to the next step...');
        console.log('Validated orders:', data.orders);
        // Next steps would go here
      } else {
        setError(data.errors.join(' '));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during validation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOrderNumbers('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="returns-container">
      <header className="returns-header">
        <h1>Return Orders</h1>
        <p>Enter order numbers or order IDs to process a return in the system</p>
      </header>

      <div className="returns-card">
        {error && <div className="error-message-box">{error}</div>}
        {success && <div className="success-message-box">{success}</div>}
        
        <div className="card-section">
          <label>Enter number(s) to process returns</label>
          <div className="textarea-container">
            <textarea
              value={orderNumbers}
              onChange={(e) => setOrderNumbers(e.target.value)}
              placeholder="Enter order numbers separated by a comma&#10;e.g. #1234, 4321, 7890, SWF-01234"
            />
            <p className="helper-text">
              Enter order number in any format separated by a comma (eg. #1926, 1567, etc.)
            </p>
          </div>
        </div>

        <div className="card-actions">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="continue-button" 
            onClick={handleContinue}
            disabled={loading || !orderNumbers.trim()}
          >
            {loading ? <Spinner size={18} /> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Returns;

