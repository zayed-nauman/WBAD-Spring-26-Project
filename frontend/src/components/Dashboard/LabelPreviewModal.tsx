import React from 'react';
import { X } from 'lucide-react';
import './LabelPreviewModal.css';

interface Order {
  id: number;
  trackingNumber: string;
  senderName?: string;
  receiverName: string;
  phoneNumber: string;
  address: string;
  city: string;
  codAmount?: number;
  weightKg: number;
  isFragile: boolean;
  items: string;
  createdAt: string;
}

interface LabelPreviewModalProps {
  isOpen: boolean;
  order?: Order;
  onClose: () => void;
  onPrint: () => void;
  onModify: () => void;
  isLoading: boolean;
}

const LabelPreviewModal: React.FC<LabelPreviewModalProps> = ({
  isOpen,
  order,
  onClose,
  onPrint,
  onModify,
  isLoading
}) => {
  if (!isOpen || !order) return null;

  const generateBarcode = (text: string) => {
    // Simple barcode representation
    return text.replace(/./g, () => Math.random() > 0.5 ? '█' : '▁');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content label-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2>Label Preview</h2>
          <p>Preview the label of your fulfilled order</p>
        </div>

        <div className="label-preview" id="labelToPrint">
          <div className="label-header">
            <div className="logo">
              <span className="logo-text">📦 ZigZag</span>
              <span className="logo-subtitle">DELIVERY</span>
            </div>
          </div>

          <div className="label-content">
            <div className="label-order-id">Order Number: {order.trackingNumber}</div>

            <table className="label-table">
              <tbody>
                <tr>
                  <td className="label-label">RECIPIENT</td>
                  <td className="label-label">SENDER</td>
                </tr>
                <tr>
                  <td className="label-value">{order.receiverName}</td>
                  <td className="label-value">{order.senderName || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="label-label">City</td>
                  <td className="label-label">Weight (kg)</td>
                </tr>
                <tr>
                  <td className="label-value">{order.city}</td>
                  <td className="label-value">{order.weightKg}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="label-label">Address</td>
                </tr>
                <tr>
                  <td colSpan={2} className="label-value address-value">
                    {order.address}
                  </td>
                </tr>
                <tr>
                  <td className="label-label">Amount</td>
                  <td className="label-label">No. of Pieces</td>
                </tr>
                <tr>
                  <td className="label-value">PKR {order.codAmount || 'N/A'}</td>
                  <td className="label-value">{order.items}</td>
                </tr>
                <tr>
                  <td className="label-label">Phone Number</td>
                  <td className="label-label">Date</td>
                </tr>
                <tr>
                  <td className="label-value">{order.phoneNumber}</td>
                  <td className="label-value">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="barcode-section">
              <div className="barcode">
                {generateBarcode(order.phoneNumber)}
              </div>
              <div className="barcode-text">{order.phoneNumber}</div>
            </div>

            <div className="fragile-section">
              {order.isFragile && (
                <div className="fragile-stamp">
                  <div className="fragile-text">FRAGILE</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="label-notice">
          Printing this label will change order status to <strong>Ready for Pickup</strong>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-secondary"
            onClick={onModify}
            disabled={isLoading}
          >
            Modify Order
          </button>
          <button
            className="btn btn-primary"
            onClick={onPrint}
            disabled={isLoading}
          >
            {isLoading ? 'Printing...' : 'Print Label'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelPreviewModal;
