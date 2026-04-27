import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import LifecycleSelector from '../../features/orders/components/LifecycleSelector';
import './StatusUpdateModal.css';

interface Order {
  id: number;
  trackingNumber: string;
  receiverName: string;
  city: string;
  status: string;
  isFragile: boolean;
}

// Status constants are now handled by LifecycleSelector

interface StatusUpdateModalProps {
  isOpen: boolean;
  order?: Order;
  onClose: () => void;
  onStatusUpdate: (status: string) => Promise<void>;
  isLoading: boolean;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  order,
  onClose,
  onStatusUpdate,
  isLoading
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const currentStatus = order.status;
  
  const handleSave = async () => {
    if (selectedStatus && selectedStatus !== currentStatus) {
      await onStatusUpdate(selectedStatus);
      setSelectedStatus(null);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2>Update Order Status</h2>
          <p>
            Modify the lifecycle state of your order once when state completes to reflect the real-life stage of the order
          </p>
        </div>

        <div className="status-order-summary">
          <div className="summary-left">
            Order #{order.trackingNumber} - {order.receiverName} - {order.city}
          </div>
          <div className="summary-right">
            <span>CURRENT STATUS:</span>
            <span className="status-badge-inline">{currentStatus.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div className="lifecycle-section">
          <LifecycleSelector 
            value={selectedStatus || currentStatus} 
            onChange={(status) => setSelectedStatus(status)} 
          />
        </div>

        <div className="status-footer-actions">
          <div className="fragile-toggle">
            <span>Fragile:</span>
            <div className={`toggle-btn ${order.isFragile ? 'active' : ''}`}>
              <div className="toggle-slider"></div>
            </div>
          </div>
          
          <div className="modal-buttons">
            <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button className="btn-modify" disabled={isLoading}>
              Modify Order
            </button>
            <button 
              className="btn-save" 
              onClick={handleSave} 
              disabled={!selectedStatus || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;
