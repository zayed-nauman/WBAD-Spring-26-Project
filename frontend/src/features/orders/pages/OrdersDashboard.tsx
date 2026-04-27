import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrderFilters from '../components/OrderFilters';
import OrdersTable from '../components/OrdersTable';
import BlacklistedOrderWarningModal from '../components/BlacklistedOrderWarningModal';
import DeleteOrderConfirmModal from '../components/DeleteOrderConfirmModal';
import Spinner from '../../../components/Common/Spinner';
import { orderApi, type Order, type OrderFilters as FilterValues } from '../services/orderApi';
import '../styles/orders.css';

const OrdersDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [loading, setLoading] = useState(true);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningAction, setWarningAction] = useState<'modify' | 'status' | 'label'>('modify');
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrders = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const data = await orderApi.listOrders(activeFilters);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (location.state?.orderSaved) {
      setFilters({});
      loadOrders({});
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadOrders(filters), 250);
    return () => window.clearTimeout(timeout);
  }, [filters]);

  const cities = useMemo(() => [...new Set(orders.map((order) => order.city).filter(Boolean))], [orders]);

  const handleEdit = (order: Order) => {
    if (order.isBlacklisted) {
      setWarningAction('modify');
      setWarningOpen(true);
      return;
    }

    navigate(`/orders/${order.id}/edit`);
  };

  const handleLabel = (order: Order) => {
    if (order.isBlacklisted) {
      setWarningAction('label');
      setWarningOpen(true);
      return;
    }

    navigate(`/orders/${order.id}/label`);
  };

  const handleStatus = (order: Order) => {
    if (order.isBlacklisted) {
      setWarningAction('status');
      setWarningOpen(true);
      return;
    }

    navigate(`/orders/${order.id}/status`);
  };

  const handleDeleteClick = (order: Order) => {
    setDeleteTarget(order);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await orderApi.deleteOrder(deleteTarget.id);
      setOrders((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container orders-dashboard-page">
      <div className="page-header">
        <div>
          <h1>Orders Dashboard</h1>
          <p>All your orders at a glance. Click on order “Status” to progress and modify order stage.</p>
        </div>
        <button type="button" className="orders-new-btn" onClick={() => navigate('/orders/new')}>
          + New Order
        </button>
      </div>

      <OrderFilters filters={filters} onChange={setFilters} cities={cities} />
      {loading ? <div className="orders-loading"><Spinner size={40} /></div> : <OrdersTable orders={orders} onEdit={handleEdit} onLabel={handleLabel} onDelete={handleDeleteClick} onStatus={handleStatus} />}
      <BlacklistedOrderWarningModal open={warningOpen} action={warningAction} onCancel={() => setWarningOpen(false)} />
      <DeleteOrderConfirmModal
        open={Boolean(deleteTarget)}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default OrdersDashboard;
