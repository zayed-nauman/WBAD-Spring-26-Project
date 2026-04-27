import React, { useState } from 'react';
import { Search } from 'lucide-react';
import './OrderFilters.css';

interface FilterState {
  search: string;
  city: string;
  status: string;
  priceMin: string;
  priceMax: string;
  sender: string;
}

interface OrderFiltersProps {
  cities: string[];
  statuses: string[];
  onFilterChange: (filters: FilterState) => void;
}

const OrderFilters: React.FC<OrderFiltersProps> = ({
  cities,
  statuses,
  onFilterChange
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    city: '',
    status: '',
    priceMin: '',
    priceMax: '',
    sender: ''
  });

  const handleInputChange = (field: keyof FilterState, value: string) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleReset = () => {
    const empty: FilterState = {
      search: '',
      city: '',
      status: '',
      priceMin: '',
      priceMax: '',
      sender: ''
    };
    setFilters(empty);
    onFilterChange(empty);
  };

  return (
    <div className="filters-section">
      <h3>Filters</h3>
      <div className="filters-grid">
        <div className="filter-group search-group">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Hinted search text"
              value={filters.search}
              onChange={(e) => handleInputChange('search', e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <select
          value={filters.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          className="filter-select"
        >
          <option value="">Select city</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">Select status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.split('_').join(' ')}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Price..."
          value={filters.priceMin}
          onChange={(e) => handleInputChange('priceMin', e.target.value)}
          className="filter-input"
        />

        <input
          type="text"
          placeholder="Sender..."
          value={filters.sender}
          onChange={(e) => handleInputChange('sender', e.target.value)}
          className="filter-input"
        />

        <button onClick={handleReset} className="reset-btn">
          Reset
        </button>
      </div>
    </div>
  );
};

export default OrderFilters;
