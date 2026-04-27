import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { riderApi, type RiderPayload } from '../services/riderApi';
import '../../orders/styles/orders.css';
import '../styles/riders.css';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
    return response?.data?.error || response?.data?.message || fallback;
  }

  return fallback;
};

const emptyForm: RiderPayload = {
  riderName: '',
  city: '',
  location: '',
  vehicle: '',
  phoneNumber: '',
  zone: '',
  weightCapacityKg: '',
  orderCapacity: '',
  joiningDate: new Date().toISOString().slice(0, 10),
};

const RiderFormPage = ({ mode }: { mode: 'create' | 'edit' }) => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [riderNumber, setRiderNumber] = useState('RDR-00001');
  const [form, setForm] = useState<RiderPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'create') {
      riderApi.getNextRiderNumber().then(setRiderNumber);
      return;
    }
    riderApi.getRider(id).then((rider) => {
      setRiderNumber(rider.riderNumber);
      setForm({
        riderName: rider.name || '',
        city: rider.city || '',
        location: rider.location || '',
        vehicle: rider.vehicle || '',
        phoneNumber: rider.phoneNumber || '',
        zone: rider.zone || '',
        weightCapacityKg: rider.weightCapacityKg || '',
        orderCapacity: rider.orderCapacity || '',
        joiningDate: rider.joiningDate ? rider.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    });
  }, [mode, id]);

  const setField = (field: keyof RiderPayload, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (mode === 'create') await riderApi.createRider({ ...form, riderNumber });
      else await riderApi.updateRider(id, form);
      navigate('/rider-pool');
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, 'Failed to save rider.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteRider = async () => {
    setError('');
    setSaving(true);
    try {
      await riderApi.deleteRider(id);
      navigate('/rider-pool');
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, 'Failed to delete rider.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container rider-page">
      <div className="page-header">
        <div>
          <h1>{mode === 'create' ? 'Create a New Rider' : 'Modify Rider'}</h1>
          <p>
            {mode === 'create'
              ? 'Create a new rider manually to be added amongst your existing riders or cancel to return back to riders page.'
              : 'Make changes to existing rider or cancel to return back to riders page.'}
          </p>
        </div>
      </div>
      <form className="rider-form-card" onSubmit={save}>
        <p className="rider-number">Rider Number: {riderNumber}</p>
        {error && <div className="orders-form-error">{error}</div>}
        <div className="rider-form-grid">
          <label>Rider Name<input value={form.riderName} onChange={(e) => setField('riderName', e.target.value)} placeholder="Bilal Akhtar" required /></label>
          <label>Zone<input value={form.zone} onChange={(e) => setField('zone', e.target.value)} placeholder="South" required /></label>
          <label>City<input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="City" required /></label>
          <label>Max Weight Capacity (kg)<input value={form.weightCapacityKg} onChange={(e) => setField('weightCapacityKg', e.target.value)} placeholder="Weight (kg)" type="number" required /></label>
          <label>Location<input value={form.location} onChange={(e) => setField('location', e.target.value)} placeholder="Location" required /></label>
          <label>Order Capacity<input value={form.orderCapacity} onChange={(e) => setField('orderCapacity', e.target.value)} placeholder="No. of Orders" type="number" required /></label>
          <label>Vehicle<input value={form.vehicle} onChange={(e) => setField('vehicle', e.target.value)} placeholder="Vehicle" required /></label>
          <label>Joining Date<input value={form.joiningDate} onChange={(e) => setField('joiningDate', e.target.value)} type="date" required /></label>
          <label>Phone Number<input value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} placeholder="Phone Number" required /></label>
        </div>
        <div className="rider-form-actions">
          <button type="button" className="orders-btn orders-btn-secondary" onClick={() => navigate('/rider-pool')}>Cancel</button>
          {mode === 'edit' && <button type="button" className="orders-btn orders-btn-outline" onClick={deleteRider} disabled={saving}>Delete Rider</button>}
          <button type="submit" className="orders-btn orders-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default RiderFormPage;
