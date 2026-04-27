import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AssignedRiderCard from '../components/AssignedRiderCard';
import OrderSummaryCard from '../components/OrderSummaryCard';
import { riderApi, type Recommendations, type Rider } from '../services/riderApi';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const AssignmentSuccessPage = () => {
  const { orderId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const riderId = location.state?.riderId;
  const [data, setData] = useState<Recommendations | null>(null);

  useEffect(() => {
    riderApi.getRecommendations(orderId).then(setData).catch(() => undefined);
  }, [orderId]);

  const rider = useMemo<Rider | undefined>(() => data?.riders.find((item) => String(item.id) === String(riderId)) || data?.riders[0], [data, riderId]);

  return (
    <div className="page-container rider-page">
      <div className="page-header">
        <div>
          <h1>Rider Successfully Assigned</h1>
          <p>The order has been assigned and the rider has been notified. The order status has been updated.</p>
        </div>
        <Check className="rider-success-check" size={104} />
      </div>
      <div className="rider-large-card">
        <h2>Your Order Details</h2>
        <div className="rider-inner-panel">
          {data?.order && <OrderSummaryCard order={data.order} assigned>{rider && <AssignedRiderCard rider={rider} />}</OrderSummaryCard>}
          {!data?.order && <p>Assignment saved successfully.</p>}
        </div>
        <div className="rider-success-actions">
          <button className="orders-btn orders-btn-primary" onClick={() => navigate('/orders')}>
            <ArrowLeft size={22} /> Return to Orders
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentSuccessPage;
