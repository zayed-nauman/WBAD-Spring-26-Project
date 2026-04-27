import type { Order } from '../../orders/services/orderApi';

type Props = {
  order: Order & { zone?: string; numberOfPieces?: number; amount?: number };
  assigned?: boolean;
  children?: React.ReactNode;
};

const OrderSummaryCard = ({ order, assigned = false, children }: Props) => (
  <div className="rider-summary-card">
    <div>
      <h3>Order #{order.trackingNumber}</h3>
      <p>Recipient: {order.receiverName}</p>
      <p>{order.city} · Zone: {order.zone || order.city}</p>
      {assigned && <span className="rider-assigned-chip">ASSIGNED</span>}
      {children}
    </div>
    <div className="rider-summary-metrics">
      <p>{order.numberOfPieces || 1} Items</p>
      <p>{Number(order.weightKg || 0).toFixed(1).replace('.0', '')} kg</p>
      <strong>PKR {Number(order.codAmount || order.amount || 0).toLocaleString()}</strong>
    </div>
  </div>
);

export default OrderSummaryCard;
