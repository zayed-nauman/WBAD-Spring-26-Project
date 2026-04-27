import { Edit3, Printer, Trash2 } from 'lucide-react';
import type { Order } from '../services/orderApi';
import StatusBadge from './StatusBadge';

type Props = {
  orders: Order[];
  onEdit: (order: Order) => void;
  onLabel: (order: Order) => void;
  onDelete: (order: Order) => void;
  onStatus: (order: Order) => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace(/ /g, '-');

const formatAmount = (amount?: number) => (amount || amount === 0 ? `${Number(amount).toLocaleString()} PKR` : '-');

const canPrintLabel = (order: Order) => ['FULFILLMENT', 'READY_FOR_PICKUP'].includes(order.status);

const OrdersTable = ({ orders, onEdit, onLabel, onDelete, onStatus }: Props) => {
  return (
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
              <td>{formatAmount(order.codAmount)}</td>
              <td>
                <StatusBadge status={order.status} blacklisted={order.isBlacklisted} onClick={() => onStatus(order)} />
              </td>
              <td>
                <div className="orders-action-icons">
                  <button type="button" aria-label="Edit order" onClick={() => onEdit(order)}>
                    <Edit3 size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Print label"
                    className={!canPrintLabel(order) ? 'orders-action-disabled' : undefined}
                    onClick={() => canPrintLabel(order) && onLabel(order)}
                    disabled={!canPrintLabel(order)}
                    title={!canPrintLabel(order) ? 'Label can be printed only for fulfilled or ready for pickup orders' : undefined}
                  >
                    <Printer size={18} />
                  </button>
                  <button type="button" aria-label="Delete order" onClick={() => onDelete(order)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!orders.length && (
            <tr>
              <td colSpan={9} className="orders-empty">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
