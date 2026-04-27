import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import type { Order } from '../../orders/services/orderApi';
import RiderReadyOrdersTable from '../components/RiderReadyOrdersTable';
import { riderApi } from '../services/riderApi';
import Spinner from '../../../components/Common/Spinner';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const RiderOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', city: '', price: '', sender: '' });

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => {
      riderApi.listReadyOrders(filters)
        .then(setOrders)
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [filters]);

  const cities = useMemo(() => [...new Set(orders.map((order) => order.city).filter(Boolean))], [orders]);

  return (
    <div className="page-container rider-page">
      <div className="page-header">
        <div>
          <h1>Orders Ready for Rider Assignment</h1>
          <p>All orders ready for pickup and eligible to be assigned a rider are displayed here. Choose a rider manually.</p>
        </div>
      </div>

      <section className="orders-filters">
        <h2>Filters</h2>
        <div className="orders-filter-row">
          <label className="orders-search">
            <Menu size={20} />
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Hinted search text" />
            <Search size={22} />
          </label>
          <select value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })}>
            <option value="">Select city</option>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
          <input value={filters.price} onChange={(event) => setFilters({ ...filters, price: event.target.value })} placeholder="Price..." />
          <input value={filters.sender} onChange={(event) => setFilters({ ...filters, sender: event.target.value })} placeholder="Sender..." />
        </div>
      </section>

      <div className="orders-table-wrap">
        {loading ? (
          <div className="orders-loading" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <Spinner size={40} />
          </div>
        ) : (
          <RiderReadyOrdersTable orders={orders} onAssign={(order) => navigate(`/riders/assign/${order.id}`)} />
        )}
      </div>
    </div>
  );
};

export default RiderOrdersPage;
