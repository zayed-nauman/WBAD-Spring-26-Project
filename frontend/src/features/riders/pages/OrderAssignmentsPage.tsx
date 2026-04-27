import { Menu, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../orders/components/StatusBadge';
import DeleteOrderConfirmModal from '../../orders/components/DeleteOrderConfirmModal';
import { orderApi } from '../../orders/services/orderApi';
import Spinner from '../../../components/Common/Spinner';
import { riderApi, type AssignedOrder, type RiderFilters } from '../services/riderApi';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const formatWeight = (value: number) => Number(value || 0).toFixed(1).replace(/\.0$/, '');

const OrderAssignmentsPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [filters, setFilters] = useState<RiderFilters>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AssignedOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    return riderApi.listAssignedOrders(filters)
      .then(setOrders)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadOrders();
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [filters]);

  const cities = useMemo(() => [...new Set(orders.map((order) => order.city).filter(Boolean))], [orders]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await orderApi.deleteOrder(deleteTarget.id);
      setOrders((current) => current.filter((order) => order.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container rider-page">
      <div className="page-header">
        <div>
          <h1>Order Assignments</h1>
          <p>View or edit your current order assignments. You can view the rider assignment for your orders and relevant details for them.</p>
        </div>
      </div>

      <section className="orders-filters">
        <h2>Filters</h2>
        <div className="orders-filter-row">
          <label className="orders-search">
            <Menu size={20} />
            <input value={filters.search || ''} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Hinted search text" />
            <Search size={22} />
          </label>
          <select value={filters.city || ''} onChange={(event) => setFilters({ ...filters, city: event.target.value })}>
            <option value="">Select city</option>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
          <input value={filters.location || ''} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="Location..." />
          <input value={filters.capacity || ''} onChange={(event) => setFilters({ ...filters, capacity: event.target.value })} placeholder="Capacity..." />
        </div>
      </section>

      <div className="orders-table-wrap">
        {loading ? (
          <div className="orders-loading"><Spinner size={40} /></div>
        ) : (
          <table className="orders-table order-assignments-table">
            <thead>
              <tr>
                <th>RIDER ID</th>
                <th>NAME</th>
                <th>ORDER ID</th>
                <th>SENDER</th>
                <th>RECEIVER</th>
                <th>CITY</th>
                <th>LOCATION</th>
                <th>ORDER WEIGHT (kg)</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const rider = order.riderAssignment.rider;

                return (
                  <tr key={order.id}>
                    <td>{rider.riderNumber}</td>
                    <td>{rider.name}</td>
                    <td>{order.trackingNumber}</td>
                    <td>{order.senderName || '-'}</td>
                    <td>{order.receiverName}</td>
                    <td>{order.city}</td>
                    <td className="rider-location-cell">{order.address}</td>
                    <td>{formatWeight(order.weightKg)}</td>
                    <td>
                      <StatusBadge status={order.status} blacklisted={order.isBlacklisted} onClick={() => navigate(`/order-assignments/${order.id}/status`)} />
                    </td>
                    <td>
                      <div className="orders-action-icons">
                        <button type="button" aria-label="Delete order" onClick={() => setDeleteTarget(order)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!orders.length && (
                <tr>
                  <td colSpan={10} className="orders-empty">
                    No rider assigned orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <DeleteOrderConfirmModal
        open={Boolean(deleteTarget)}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default OrderAssignmentsPage;
