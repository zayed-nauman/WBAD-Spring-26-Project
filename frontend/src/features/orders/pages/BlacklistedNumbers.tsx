import { PlusCircle, Search, Trash2, ShieldAlert, Phone, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi, type BlacklistedNumber } from '../services/orderApi';
import Spinner from '../../../components/Common/Spinner';
import '../styles/orders.css';

const BlacklistedNumbers = () => {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<BlacklistedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [singleNumber, setSingleNumber] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNumbers = async () => {
    const data = await orderApi.listBlacklistedNumbers();
    setNumbers(data);
    return data;
  };

  useEffect(() => {
    setLoading(true);
    loadNumbers()
      .catch((loadError: any) => {
        setError(loadError?.response?.data?.error || loadError?.response?.data?.message || 'Failed to load blacklisted numbers.');
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleNumbers = useMemo(
    () => (Array.isArray(numbers) ? numbers : []).filter((entry) => 
      (entry?.phoneNumber || '').includes(search.replace(/\D/g, ''))
    ),
    [numbers, search]
  );

  const addSingle = async () => {
    if (!singleNumber.trim()) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await orderApi.addBlacklistedNumber(singleNumber);
      setSingleNumber('');
      await loadNumbers();
      setMessage('Phone number added to blacklist.');
    } catch (addError: any) {
      setError(addError?.response?.data?.error || addError?.response?.data?.message || 'Failed to add phone number.');
    } finally {
      setSaving(false);
    }
  };

  const addBulk = async () => {
    const phoneNumbers = bulkText.split(/\n|,/).map((number) => number.trim()).filter(Boolean);
    if (!phoneNumbers.length) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const result = await orderApi.bulkAddBlacklistedNumbers(phoneNumbers);
      setBulkText('');
      await loadNumbers();
      setMessage(`${result.count || 0} phone number${result.count === 1 ? '' : 's'} imported.`);
    } catch (bulkError: any) {
      setError(bulkError?.response?.data?.error || bulkError?.response?.data?.message || 'Failed to import phone numbers.');
    } finally {
      setSaving(false);
    }
  };

  const deleteNumber = async (id: number) => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await orderApi.deleteBlacklistedNumber(id);
      setNumbers((current) => current.filter((entry) => entry.id !== id));
      setMessage('Phone number removed from blacklist.');
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.error || deleteError?.response?.data?.message || 'Failed to remove phone number.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="page-container blacklist-page">
      <div className="page-header">
        <div>
          <h1>Blacklisted Phone Numbers</h1>
          <p>Add defaulter or fraudulent phone numbers, so once an order is placed using them a disclaimer can be issued.</p>
        </div>
      </div>

      <div className="blacklist-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Spinner size={40} />
          </div>
        ) : (
          <>
            {error && <div className="orders-form-error">{error}</div>}
            {message && <div className="orders-form-success">{message}</div>}

            <div className="blacklist-section">
              <h2><Search size={20} /> Search & Manage</h2>
              <p>Find and remove existing fraudulent numbers from your database.</p>
              <div className="blacklist-search-input">
                <Search size={18} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search blacklisted numbers..." />
              </div>

              <div className="blacklist-list">
                {visibleNumbers.map((entry) => (
                  <div key={entry.id} className="blacklist-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ShieldAlert size={18} color="var(--status-red)" />
                      <strong>{entry.phoneNumber}</strong>
                    </div>
                    <button type="button" onClick={() => deleteNumber(entry.id)} disabled={saving} title="Remove from blacklist">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {visibleNumbers.length === 0 && (
                  <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', opacity: 0.5 }}>
                    No blacklisted numbers found.
                  </p>
                )}
              </div>
            </div>

            <div className="blacklist-section">
              <h2><PlusCircle size={20} /> Add Single Number</h2>
              <p>Add a specific number to block any orders associated with it.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="blacklist-search-input" style={{ flex: 1 }}>
                  <Phone size={18} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
                  <input value={singleNumber} onChange={(event) => setSingleNumber(event.target.value)} placeholder="Enter phone number (e.g. 03001234567)" />
                </div>
                <button type="button" className="orders-btn orders-btn-primary" onClick={addSingle} disabled={saving}>
                  {saving ? <Spinner size={18} /> : 'Add to Blacklist'}
                </button>
              </div>
            </div>

            <div className="blacklist-section">
              <h2><FileText size={20} /> Bulk Import</h2>
              <p>Paste multiple phone numbers separated by commas or new lines.</p>
              <div className="blacklist-bulk">
                <textarea
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  placeholder="03001112222&#10;03219998888&#10;03451234567"
                />
                <button type="button" className="orders-btn orders-btn-primary" onClick={addBulk} disabled={saving} style={{ alignSelf: 'flex-end' }}>
                  {saving ? <Spinner size={18} /> : 'Process Bulk Import'}
                </button>
              </div>
            </div>

            <div className="orders-form-actions">
              <button type="button" className="orders-btn orders-btn-secondary" onClick={() => navigate('/orders')}>
                Return to Orders
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BlacklistedNumbers;
