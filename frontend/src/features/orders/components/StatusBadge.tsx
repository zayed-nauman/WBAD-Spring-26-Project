import type { OrderStatus } from '../services/orderApi';

const labels: Record<string, string> = {
  ORDER_RECEIVED: 'ORDER RECEIVED',
  FULFILLMENT: 'FULFILLED',
  READY_FOR_PICKUP: 'READY FOR PICKUP',
  PICKUP_IN_PROGRESS: 'PICKUP IN PROGRESS',
  PICKED_UP: 'PICKED UP',
  SHIPMENT_DISPATCHED: 'SHIPMENT DISPATCHED',
  IN_TRANSIT: 'IN TRANSIT',
  OUT_FOR_DELIVERY: 'OUT FOR DELIVERY',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED',
  BLACKLISTED: 'BLACKLISTED',
};

type Props = {
  status: OrderStatus | string;
  blacklisted?: boolean;
  onClick?: () => void;
};

const StatusBadge = ({ status, blacklisted, onClick }: Props) => {
  const effectiveStatus = blacklisted ? 'BLACKLISTED' : status;
  const className = `orders-status orders-status-${String(effectiveStatus).toLowerCase().replaceAll('_', '-')}`;

  return (
    <button type="button" className={className} onClick={onClick}>
      {blacklisted && <span aria-hidden="true">▲</span>}
      {labels[effectiveStatus] || String(effectiveStatus).replaceAll('_', ' ')}
    </button>
  );
};

export default StatusBadge;
