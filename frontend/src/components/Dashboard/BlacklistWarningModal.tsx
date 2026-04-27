import React from 'react';
import { AlertCircle } from 'lucide-react';
import './BlacklistWarningModal.css';

interface BlacklistWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlacklistWarningModal: React.FC<BlacklistWarningModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content warning-modal" onClick={e => e.stopPropagation()}>
        <div className="warning-body">
          <div className="warning-icon-wrapper">
            <AlertCircle size={32} className="warning-icon" />
            <span className="warning-title">Warning!</span>
          </div>
          <p className="warning-message">
            You are modifying a blacklisted order. Cancel to return or delete the order.
          </p>
          <div className="warning-footer">
            <button className="btn-cancel-warning" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlacklistWarningModal;
