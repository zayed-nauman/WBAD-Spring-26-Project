import { Menu, Search } from 'lucide-react';
import type { OrderFilters as FilterValues } from '../services/orderApi';

type Props = {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  cities: string[];
};

const statusOptions = [
  ['ORDER_RECEIVED', 'Order received'],
  ['READY_FOR_PICKUP', 'Ready for pickup'],
  ['IN_TRANSIT', 'In transit'],
  ['OUT_FOR_DELIVERY', 'Out for delivery'],
  ['DELIVERED', 'Delivered'],
  ['BLACKLISTED', 'Blacklisted'],
];

const OrderFilters = ({ filters, onChange, cities }: Props) => {
  const setFilter = (key: keyof FilterValues, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="orders-filters" aria-label="Order filters">
      <h2>Filters</h2>
      <div className="orders-filter-row">
        <label className="orders-search">
          <Menu size={20} />
          <input
            value={filters.search || ''}
            onChange={(event) => setFilter('search', event.target.value)}
            placeholder="Hinted search text"
          />
          <Search size={22} />
        </label>

        <select value={filters.city || ''} onChange={(event) => setFilter('city', event.target.value)}>
          <option value="">Select city</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select value={filters.status || ''} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">Select status</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input value={filters.price || ''} onChange={(event) => setFilter('price', event.target.value)} placeholder="Price..." />
        <input value={filters.sender || ''} onChange={(event) => setFilter('sender', event.target.value)} placeholder="Sender..." />
      </div>
    </section>
  );
};

export default OrderFilters;
