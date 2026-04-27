import React from 'react';
import { Edit, Printer, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Spinner from '../Common/Spinner';
import './OrderTable.css';

interface Order {
  id: number;
  trackingNumber: string;
  senderName?: string;
  receiverName: string;
  phoneNumber: string;
  address: string;
  city: string;
  codAmount?: number;
  items: string;
  status: string;
  isBlacklisted: boolean;
  createdAt: string;
}

interface OrderTableProps {
  orders: Order[];
  onStatusClick: (orderId: number) => void;
  loading: boolean;
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onStatusClick,
  loading
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatAmount = (amount?: number): string => {
    if (!amount) return 'N/A';
    return `${amount.toLocaleString()} PKR`;
  };

  if (loading) {
    return <div className="loading-message"><Spinner size={40} /></div>;
  }

  if (orders.length === 0) {
    return <div className="no-orders-message">No orders found</div>;
  }

  return (
    <div className="table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Sender</th>
            <th>Recipient</th>
            <th>Phone Number</th>
            <th>Date</th>
            <th>City</th>
            <th>Amount</th>
            <th>Items</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className={order.isBlacklisted ? 'blacklisted-row' : ''}>
              <td className="order-id">{order.trackingNumber}</td>
              <td>{order.senderName || 'N/A'}</td>
              <td>{order.receiverName}</td>
              <td>{order.phoneNumber}</td>
              <td>{formatDate(order.createdAt)}</td>
              <td>{order.city}</td>
              <td className="amount">{formatAmount(order.codAmount)}</td>
              <td className="items-cell" title={order.items || ''}>
                {order.items ? (order.items.length > 20 ? order.items.substring(0, 17) + '...' : order.items) : 'N/A'}
              </td>
              <td className="status-cell">
                <div 
                  className="status-clickable" 
                  onClick={() => onStatusClick(order.id)}
                  title="Update status"
                >
                  <StatusBadge status={order.isBlacklisted ? 'BLACKLISTED' : order.status} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
