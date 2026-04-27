import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LifecycleSelector from '../components/LifecycleSelector';
import StatusBadge from '../components/StatusBadge';
import BlacklistedOrderWarningModal from '../components/BlacklistedOrderWarningModal';
import { orderApi, type Order } from '../services/orderApi';
import { riderApi } from '../../riders/services/riderApi';
import Spinner from '../../../components/Common/Spinner';
import '../styles/orders.css';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
    return response?.data?.error || response?.data?.message || fallback;
  }

  return fallback;
};

const UpdateOrderStatus = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<Order | undefined>();
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warningOpen, setWarningOpen] = useState(false);
  const isAssignmentStatusPage = location.pathname.startsWith('/order-assignments');
  const returnPath = isAssignmentStatusPage ? '/order-assignments' : '/orders';
  const selectableStatuses = isAssignmentStatusPage
    ? ['PICKUP_IN_PROGRESS', 'PICKED_UP', 'SHIPMENT_DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']
    : ['ORDER_RECEIVED', 'FULFILLMENT', 'READY_FOR_PICKUP'];
  const canSave = selectableStatuses.includes(status);
  const isStatusLocked = Boolean(!isAssignmentStatusPage && order?.labelGenerated && order.status !== status);

  useEffect(() => {
    const loadOrder = isAssignmentStatusPage ? riderApi.getAssignedOrder : orderApi.getOrder;

    loadOrder(id)
      .then((data) => {
        setError('');
        setOrder(data);
        setStatus(data.status);
      })
      .catch((loadError: unknown) => {
        setError(getErrorMessage(loadError, 'Failed to load order status.'));
      });
  }, [id, isAssignmentStatusPage]);

  const handleSave = async () => {
    if (!canSave) return;

    if (order?.isBlacklisted) {
      setWarningOpen(true);
      return;
    }

    setError('');
    setSaving(true);
    try {
      await orderApi.updateStatus(id, status, true, isAssignmentStatusPage ? 'ORDER_ASSIGNMENT' : undefined);
      navigate(returnPath, { replace: true, state: { orderSaved: true } });
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, 'Failed to update status.'));
    } finally {
      setSaving(false);
    }
  };

  if (!order) return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      {error ? (
        <div className="orders-status-card">
          <div className="orders-form-error">{error}</div>
          <button type="button" className="orders-btn orders-btn-secondary" onClick={() => navigate(returnPath)}>
            Cancel
          </button>
        </div>
      ) : (
        <Spinner size={40} />
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Update Order Status</h1>
          <p>Modify the lifecycle state of your order once when state completes to reflect the real-life stage of the order</p>
        </div>
      </div>
      <div className="orders-status-card">
        <div className="orders-status-topline">
          <strong>
            Order #{order.trackingNumber} · {order.receiverName} · {order.city}
          </strong>
          <div className="orders-current-status">
            <span>CURRENT STATUS:</span>
            <StatusBadge status={order.status} blacklisted={order.isBlacklisted} />
          </div>
        </div>
        {error && <div className="orders-form-error">{error}</div>}
        {!isAssignmentStatusPage && order.labelGenerated && <div className="orders-form-error">Order status cannot be changed after the label has been printed.</div>}
        <LifecycleSelector value={status} onChange={setStatus} selectableStatuses={selectableStatuses} />
        <div className="orders-status-bottom">
          <div className="orders-form-actions">
            <button type="button" className="orders-btn orders-btn-secondary" onClick={() => navigate(returnPath)}>
              Cancel
            </button>
            {!isAssignmentStatusPage && <button type="button" className="orders-btn orders-btn-outline" onClick={() => navigate(`/orders/${id}/edit`)}>
              Modify Order
            </button>}
            <button type="button" className="orders-btn orders-btn-primary" onClick={handleSave} disabled={saving || !canSave || isStatusLocked}>
              {saving ? <Spinner size={20} /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      <BlacklistedOrderWarningModal open={warningOpen} action="status" onCancel={() => setWarningOpen(false)} />
    </div>
  );
};

export default UpdateOrderStatus;
