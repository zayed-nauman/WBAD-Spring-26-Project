import { Menu, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { riderApi, type Rider, type RiderFilters } from '../services/riderApi';
import Spinner from '../../../components/Common/Spinner';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const formatCapacityValue = (value: number) => Number(value || 0).toFixed(1).replace(/\.0$/, '');

const RiderPoolPage = () => {
  const navigate = useNavigate();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [filters, setFilters] = useState<RiderFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const timeout = window.setTimeout(() => {
      riderApi.listRiders(filters)
        .then((data) => {
          if (!cancelled) setRiders(data);
        })
        .catch(() => {
          if (!cancelled) {
            setRiders([]);
            setError('Failed to load riders.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [filters]);

  const cities = useMemo(() => [...new Set(riders.map((rider) => rider.city).filter(Boolean))], [riders]);

  return (
    <div className="page-container rider-pool-page">
      <div className="page-header">
        <div>
          <h1>Riders Pool</h1>
          <p>Search and manage your riders pool to update their availability and capacity.</p>
        </div>
        <div className="orders-header-actions">
          <button className="orders-new-btn" onClick={() => navigate('/rider-pool/new')}>+ New Rider</button>
        </div>
      </div>
      <section className="orders-filters">
        <h2>Filters</h2>
        <div className="orders-filter-row">
          <label className="orders-search">
            <Menu size={20} />
            <input value={filters.search || ''} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Hinted search text" />
            <Search size={22} />
          </label>
          <select value={filters.city || ''} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
            <option value="">Select city</option>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
          <input value={filters.location || ''} onChange={(e) => setFilters({ ...filters, location: e.target.value })} placeholder="Location..." />
          <input value={filters.capacity || ''} onChange={(e) => setFilters({ ...filters, capacity: e.target.value })} placeholder="Capacity..." />
        </div>
      </section>
      <div className="orders-table-wrap">
        {loading ? (
          <div className="orders-loading"><Spinner size={40} /></div>
        ) : (
          <table className="orders-table rider-pool-table">
          <thead>
            <tr>
              <th>RIDER ID</th>
              <th>NAME</th>
              <th>LOCATION</th>
              <th>PHONE NUMBER</th>
              <th>WEIGHT CAPACITY (kg)</th>
              <th>CITY</th>
              <th>VEHICLE</th>
              <th>ORDER CAPACITY</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} className="rider-table-empty">{error}</td>
              </tr>
            ) : riders.length === 0 ? (
              <tr>
                <td colSpan={9} className="rider-table-empty">No riders available currently</td>
              </tr>
            ) : riders.map((rider) => (
              <tr key={rider.id}>
                <td>{rider.riderNumber}</td>
                <td>{rider.name}</td>
                <td>{rider.location}</td>
                <td>{rider.phoneNumber}</td>
                <td>{formatCapacityValue(rider.currentWeightKg)}/{formatCapacityValue(rider.weightCapacityKg)}</td>
                <td>{rider.city}</td>
                <td>{rider.vehicle}</td>
                <td>{rider.currentOrderCount}/{rider.orderCapacity}</td>
                <td><button className="rider-table-action" onClick={() => navigate(`/rider-pool/${rider.id}/edit`)}>EDIT RIDER</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default RiderPoolPage;
