import type { Order } from '../../orders/services/orderApi';
import StatusBadge from '../../orders/components/StatusBadge';

type Props = {
  orders: Order[];
  onAssign: (order: Order) => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace(/ /g, '-');

const RiderReadyOrdersTable = ({ orders, onAssign }: Props) => (
  <div className="orders-table-wrap">
    <table className="orders-table">
      <thead>
        <tr>
          <th>ORDER ID</th>
          <th>SENDER</th>
          <th>RECIPIENT</th>
          <th>PHONE NUMBER</th>
          <th>DATE</th>
          <th>CITY</th>
          <th>AMOUNT</th>
          <th>STATUS</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.trackingNumber}</td>
            <td>{order.senderName || '-'}</td>
            <td>{order.receiverName}</td>
            <td>{order.phoneNumber}</td>
            <td>{formatDate(order.createdAt)}</td>
            <td>{order.city}</td>
            <td>{Number(order.codAmount || 0).toLocaleString()} PKR</td>
            <td><StatusBadge status="READY_FOR_PICKUP" /></td>
            <td>
              <button type="button" className="rider-table-action" onClick={() => onAssign(order)}>ASSIGN RIDER</button>
            </td>
          </tr>
        ))}
        {!orders.length && (
          <tr>
            <td className="orders-empty" colSpan={9}>No orders ready for rider assignment.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default RiderReadyOrdersTable;
