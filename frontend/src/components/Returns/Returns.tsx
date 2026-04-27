import React, { useState } from 'react';
import axios from 'axios';
import './Returns.css';
import Spinner from '../Common/Spinner';
import ReturnSummary from './ReturnSummary';
import ReturnConfirmation from './ReturnConfirmation';

type Step = 'input' | 'summary' | 'confirmation';

const Returns: React.FC = () => {
  const [step, setStep] = useState<Step>('input');
  const [orderNumbers, setOrderNumbers] = useState('');
  const [validatedOrders, setValidatedOrders] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!orderNumbers.trim()) return;
    
    setLoading(true);
    setError(null);

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
        setValidatedOrders(data.orders);
        setStep('summary');
      } else {
        setError(data.errors.join(' '));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'An error occurred during validation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOrderNumbers('');
    setValidatedOrders([]);
    setReason('');
    setError(null);
    setStep('input');
  };

  const handleSummaryContinue = async (returnReason: string) => {
    setLoading(true);
    setError(null);
    setReason(returnReason);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      
      for (const order of validatedOrders) {
        await axios.post(
          `${apiUrl}/api/return-cases`,
          {
            orderId: order.id,
            customerId: order.createdBy,
            reason: returnReason,
            notes: 'Complete order returned',
            refundAmount: 0 // As requested: refund 0 amount
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setStep('confirmation');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to process returns.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'summary') {
    return (
      <ReturnSummary 
        orders={validatedOrders}
        onBack={() => setStep('input')}
        onContinue={handleSummaryContinue}
        onCancel={handleCancel}
        loading={loading}
      />
    );
  }

  if (step === 'confirmation') {
    return (
      <ReturnConfirmation 
        orders={validatedOrders}
        reason={reason}
        onContinue={handleCancel}
      />
    );
  }

  return (
    <div className="page-container returns-page">
      <div className="page-header">
        <div>
          <h1>Return Orders</h1>
          <p>Enter order numbers or order IDs to process a return in the system</p>
        </div>
      </div>

      <div className="returns-card">
        {error && <div className="error-message-box">{error}</div>}
        
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
