import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrderSummaryCard from '../components/OrderSummaryCard';
import RiderRecommendationCard from '../components/RiderRecommendationCard';
import { riderApi, type Recommendations } from '../services/riderApi';
import Spinner from '../../../components/Common/Spinner';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const AssignRiderPage = () => {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Recommendations | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);

  useEffect(() => {
    riderApi.getRecommendations(orderId).then((result) => {
      setData(result);
      setSelectedRiderId(result.riders[0]?.id || null);
    });
  }, [orderId]);

  if (!data) return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Spinner size={40} />
    </div>
  );

  return (
    <div className="page-container rider-page">
      <div className="page-header">
        <div>
          <h1>Assign Rider</h1>
          <p>Assign a rider to your order based on a distance metric or choose manually.</p>
        </div>
      </div>
      <div className="rider-large-card">
        <h2>Top Riders for your selected Order</h2>
        <div className="rider-inner-panel">
          <OrderSummaryCard order={data.order} />
          <h3>Top 3 Recommended Riders</h3>
          <p className="rider-muted">Zone: <strong>{data.order.zone || data.order.city}</strong> · Ranked by distance</p>
          <div className="rider-recommendation-list">
            {data.riders.map((rider, index) => (
              <RiderRecommendationCard
                key={rider.id}
                rider={rider}
                topMatch={index === 0}
                selected={selectedRiderId === rider.id}
                onSelect={() => setSelectedRiderId(rider.id)}
              />
            ))}
          </div>
          <p className="rider-skipped"><AlertTriangle size={16} /> {data.skippedCount} riders skipped: capacity limit reached or unavailable</p>
        </div>
        <div className="rider-page-actions">
          <button className="orders-btn orders-btn-secondary" onClick={() => navigate('/riders')}>Cancel</button>
          <button className="orders-btn orders-btn-primary" disabled={!selectedRiderId} onClick={() => navigate(`/riders/confirm/${orderId}/${selectedRiderId}`)}>
            Confirm Assignment <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignRiderPage;
