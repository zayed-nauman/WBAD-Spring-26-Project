import { CheckCircle } from 'lucide-react';
import './ReturnConfirmation.css';

interface ReturnConfirmationProps {
  orders: any[];
  reason: string;
  onContinue: () => void;
}

const ReturnConfirmation: React.FC<ReturnConfirmationProps> = ({
  orders,
  reason,
  onContinue
}) => {
  return (
    <div className="page-container return-confirmation-page">
      <div className="page-header">
        <div>
          <h1>Order Return Complete!</h1>
          <p>Your order has been confirmed to be returned, the process will start to restock the item. You may continue to return more orders.</p>
        </div>
      </div>

      <div className="return-confirmation-card">
        {orders.map(order => (
          <div key={order.id} className="order-confirmation-section">
            <h3 className="return-confirmation-title">
              Return Complete Order: #{order.trackingNumber.replace('#', '')}
            </h3>

            <div className="confirmation-inner-card">
              <div className="confirmation-left">
                <div className="confirmation-item">
                  <h4>{order.receiverName} · {order.city}</h4>
                  <p>{order.numberOfPieces || 1} pieces · {Number(order.weightKg || 0).toFixed(1).replace('.0', '')} kg</p>
                </div>
                
                <p className="confirmation-reason">{reason}</p>
              </div>

              <div className="confirmation-right">
                <div className="success-icon-circle">
                  <CheckCircle size={48} />
                </div>
                <div className="success-status-text">
                  <p>Complete order returned successfully</p>
                  <span>Total amount refunded: PKR 0</span>
                </div>
              </div>

              <p className="restock-info-text">
                Returned orders take 3-4 days to restock to the sender's inventory
              </p>
            </div>
          </div>
        ))}

        <div className="confirmation-actions">
          <button className="done-btn" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnConfirmation;
