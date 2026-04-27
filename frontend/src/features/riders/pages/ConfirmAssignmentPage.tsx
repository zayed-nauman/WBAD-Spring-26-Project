import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssignedRiderCard from '../components/AssignedRiderCard';
import OrderSummaryCard from '../components/OrderSummaryCard';
import { riderApi, type Recommendations, type Rider } from '../services/riderApi';
import Spinner from '../../../components/Common/Spinner';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const ConfirmAssignmentPage = () => {
  const { orderId = '', riderId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Recommendations | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    riderApi.getRecommendations(orderId).then(setData);
  }, [orderId]);

  const rider = useMemo<Rider | undefined>(() => data?.riders.find((item) => String(item.id) === String(riderId)), [data, riderId]);

  const confirm = async () => {
    setSaving(true);
    try {
      await riderApi.assignRider(orderId, riderId);
      navigate(`/riders/success/${orderId}`, { state: { riderId } });
    } finally {
      setSaving(false);
    }
  };

  if (!data || !rider) return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Spinner size={40} />
    </div>
  );

  return (
    <div className="page-container rider-page">
      <div className="page-header">
        <div>
          <h1>Confirm Rider Assignment</h1>
          <p>Please review the details below before confirming this assignment</p>
        </div>
      </div>
      <div className="rider-large-card rider-confirm-card">
        <h2>Rider assigned against your order</h2>
        <div className="rider-inner-panel">
          <OrderSummaryCard order={data.order} />
          <h3>Assigned Rider</h3>
          <AssignedRiderCard rider={rider} />
        </div>
        <div className="rider-page-actions">
          <button className="orders-btn orders-btn-secondary" onClick={() => navigate(`/riders/assign/${orderId}`)}>Cancel</button>
          <button className="orders-btn orders-btn-primary" onClick={confirm} disabled={saving}>
            {saving ? <Spinner size={20} /> : 'Confirm Assignment'} <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAssignmentPage;
