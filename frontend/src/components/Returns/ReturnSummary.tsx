import { useState } from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import Spinner from '../Common/Spinner';
import './ReturnSummary.css';

interface ReturnSummaryProps {
  orders: any[];
  onBack: () => void;
  onContinue: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ReturnSummary: React.FC<ReturnSummaryProps> = ({
  orders,
  onBack,
  onContinue,
  onCancel,
  loading = false
}) => {
  const [reason, setReason] = useState('');

  return (
    <div className="page-container return-summary-page">
      <div className="return-summary-header">
        <div>
          <button type="button" className="return-summary-back" onClick={onBack}>
            <ArrowLeft size={20} />
            <span>Return Summary</span>
          </button>
          <p>View a summary of complete orders that will be returned.</p>
        </div>
      </div>

      <div className="return-summary-card">
        {orders.map(order => (
          <div key={order.id} className="order-summary-section">
            <h3 className="return-summary-title">
              Return Complete Order: #{order.trackingNumber.replace('#', '')}
            </h3>

            <div className="summary-items-box">
              <div className="summary-item-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Package size={18} color="var(--brand-orange)" />
                  <h4>{order.receiverName} · {order.city}</h4>
                </div>
                <p>{order.numberOfPieces || 1} pieces · {Number(order.weightKg || 0).toFixed(1).replace('.0', '')} kg</p>
              </div>

              <div className="reason-section">
                <label>Please briefly provide reason for return</label>
                <textarea
                  className="reason-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for return..."
                />
              </div>
            </div>
          </div>
        ))}

        <div className="summary-actions">
          <button className="cancel-btn" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button 
            className="continue-btn" 
            onClick={() => onContinue(reason)}
            disabled={loading || !reason.trim()}
          >
            {loading ? <Spinner size={18} /> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnSummary;
