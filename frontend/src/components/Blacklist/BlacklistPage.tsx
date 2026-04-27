import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Upload, X } from 'lucide-react';
import axios from 'axios';
import './BlacklistPage.css';

interface BlacklistedNumber {
  id: number;
  phoneNumber: string;
  reason?: string;
  createdAt: string;
}

const BlacklistPage: React.FC = () => {
  const [numbers, setNumbers] = useState<BlacklistedNumber[]>([]);
  const [filteredNumbers, setFilteredNumbers] = useState<BlacklistedNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/blacklist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNumbers(response.data);
      setFilteredNumbers(response.data);
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredNumbers(numbers);
      return;
    }
    const filtered = numbers.filter(n => 
      n.phoneNumber.includes(term)
    );
    setFilteredNumbers(filtered);
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/blacklist`, 
        { phoneNumber: newNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewNumber('');
      fetchBlacklist();
    } catch (error) {
      console.error('Error adding number:', error);
      alert('Number already blacklisted or invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const phoneList = bulkNumbers.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (phoneList.length === 0) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/blacklist/bulk`, 
        { phoneNumbers: phoneList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBulkNumbers('');
      setShowBulkModal(false);
      fetchBlacklist();
    } catch (error) {
      console.error('Error in bulk import:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this number from blacklist?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/blacklist/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBlacklist();
    } catch (error) {
      console.error('Error deleting number:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blacklist-page">
      <div className="blacklist-header">
        <h1>Blacklisted Phone Numbers</h1>
        <p>Add defaulter or fraudulent phone numbers, so once an order is placed using them a disclaimer can be issued.</p>
      </div>

      <div className="blacklist-card">
        <h3>Manage phone numbers that should be marked as blacklisted in the application.</h3>
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search blacklisted numbers..." 
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="blacklist-card">
        <h3>Add Single Phone Number</h3>
        <form onSubmit={handleAddSingle} className="add-single-form">
          <div className="input-with-icon">
            <input 
              type="text" 
              placeholder="Enter phone number..." 
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
            />
            <Search size={18} className="search-icon-inside" />
          </div>
          <p className="help-text">Enter phone number in any format (eg. +92 303 1234567, 03031234567, etc.)</p>
          <button type="submit" className="btn-primary" disabled={loading}>
            Add Phone Number
          </button>
        </form>
      </div>

      <div className="blacklist-card">
        <h3>Bulk Phone Import</h3>
        <p className="help-text">
          Add multiple phone numbers at once by entering them seperated by new lines. The system will automatically clean and validate phone numbers, skipping any that are already blacklisted
        </p>
        <button className="btn-bulk" onClick={() => setShowBulkModal(true)}>
          <Upload size={18} />
          Import Phone Numbers in Bulk
        </button>
      </div>

      <div className="blacklist-card">
        <h3>Blacklisted Phone Numbers</h3>
        <div className="blacklist-list">
          {filteredNumbers.length === 0 ? (
            <p className="no-data">No blacklisted numbers found.</p>
          ) : (
            filteredNumbers.map(n => (
              <div key={n.id} className="blacklist-item">
                <span>{n.phoneNumber}</span>
                <button className="delete-btn" onClick={() => handleDelete(n.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="blacklist-footer">
        <button className="btn-secondary" onClick={() => window.history.back()}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => alert('Changes saved!')}>
          Save Changes
        </button>
      </div>

      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content bulk-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk Import</h2>
              <button onClick={() => setShowBulkModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <textarea 
                placeholder="Enter numbers separated by new lines..." 
                value={bulkNumbers}
                onChange={e => setBulkNumbers(e.target.value)}
                rows={10}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleBulkImport} disabled={loading}>
                {loading ? 'Importing...' : 'Import Numbers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlacklistPage;
