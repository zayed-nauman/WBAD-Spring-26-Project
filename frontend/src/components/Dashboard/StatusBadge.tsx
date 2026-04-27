import React from 'react';
import './StatusBadge.css';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'ORDER_RECEIVED':
        return 'status-green';
      case 'FULFILLMENT':
        return 'status-blue';
      case 'LABEL_GENERATION':
        return 'status-blue';
      case 'READY_FOR_PICKUP':
        return 'status-orange';
      case 'PICKUP_IN_PROGRESS':
        return 'status-blue';
      case 'PICKED_UP':
        return 'status-blue';
      case 'SHIPMENT_DISPATCHED':
        return 'status-blue';
      case 'IN_TRANSIT':
        return 'status-blue';
      case 'OUT_FOR_DELIVERY':
        return 'status-blue';
      case 'DELIVERY_ATTEMPT':
        return 'status-yellow';
      case 'DELIVERED':
        return 'status-green';
      case 'FAILED':
        return 'status-red';
      case 'RETURNED':
        return 'status-orange';
      case 'BLACKLISTED':
        return 'status-red';
      default:
        return 'status-gray';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;
