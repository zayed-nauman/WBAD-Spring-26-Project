import logo from '../../../assets/logo.png';
import type { Order } from '../services/orderApi';

type Props = {
  order: Order;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace(/ /g, '-');

const ShippingLabel = ({ order }: Props) => {
  return (
    <div className="shipping-label">
      <div className="shipping-label-logo">
        <img src={logo} alt="ZigZag Delivery" />
      </div>
      <div className="shipping-label-line">Order Number: {order.trackingNumber}</div>
      <div className="shipping-label-columns">
        <div>
          <h3>RECIPIENT</h3>
          <strong>{order.receiverName}</strong>
          <span>{order.city}</span>
          <h3>City</h3>
          <span>{order.address}</span>
          <h3>Amount</h3>
          <strong>PKR {Number(order.codAmount || 0).toLocaleString()}</strong>
          <h3>Phone Number</h3>
          <span>{order.phoneNumber}</span>
          <div className="shipping-barcode">
            {Array.from({ length: 26 }).map((_, index) => (
              <i key={index} style={{ width: index % 3 === 0 ? 3 : 1 }} />
            ))}
          </div>
          <strong className="shipping-barcode-text">{order.phoneNumber}</strong>
        </div>
        <div>
          <h3>SENDER</h3>
          <strong>{order.senderName || '-'}</strong>
          <h3>Weight (kg)</h3>
          <span>{order.weightKg}</span>
          <h3>No. of Pieces</h3>
          <span>{order.numberOfPieces || 1}</span>
          <h3>{formatDate(order.createdAt)}</h3>
          <h3>Fragile</h3>
          <strong className="shipping-fragile">{order.isFragile ? 'FRAGILE' : '-'}</strong>
        </div>
      </div>
    </div>
  );
};

export default ShippingLabel;
