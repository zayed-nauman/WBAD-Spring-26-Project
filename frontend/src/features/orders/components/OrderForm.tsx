import { useEffect, useState } from 'react';
import type { Order, OrderPayload } from '../services/orderApi';
import StatusBadge from './StatusBadge';
import Spinner from '../../../components/Common/Spinner';

type Props = {
  mode: 'create' | 'edit';
  order?: Order;
  orderNumber: string;
  onSubmit: (payload: OrderPayload) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
};

const toDateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

const OrderForm = ({ mode, order, orderNumber, onSubmit, onCancel, readOnly = false, readOnlyMessage }: Props) => {
  const isWeightLocked = mode === 'edit' && order?.status === 'READY_FOR_PICKUP';
  const [form, setForm] = useState<OrderPayload>({
    orderNumber,
    recipientName: '',
    senderName: '',
    city: '',
    weightKg: '',
    address: '',
    numberOfPieces: '',
    amount: '',
    date: toDateInput(),
    phoneNumber: '',
    fragile: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order) {
      setForm((current) => ({ ...current, orderNumber }));
      return;
    }

    setForm({
      orderNumber: order.trackingNumber,
      recipientName: order.receiverName || '',
      senderName: order.senderName || '',
      city: order.city || '',
      weightKg: order.weightKg || '',
      address: order.address || '',
      numberOfPieces: order.numberOfPieces || 1,
      amount: order.codAmount || '',
      date: toDateInput(order.createdAt),
      phoneNumber: order.phoneNumber || '',
      fragile: Boolean(order.isFragile),
    });
  }, [order, orderNumber]);

  const setField = (key: keyof OrderPayload, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (readOnly) return;

    const required: Array<keyof OrderPayload> = [
      'recipientName',
      'senderName',
      'city',
      'weightKg',
      'address',
      'numberOfPieces',
      'amount',
      'date',
      'phoneNumber',
    ];

    if (required.some((field) => !String(form[field] ?? '').trim())) {
      setError('Please fill all required fields.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || submitError?.response?.data?.message || 'Failed to save order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="orders-form-card" onSubmit={handleSubmit}>
      <div className="orders-form-topline">
        <p>Order Number: {form.orderNumber}</p>
        <div className="orders-current-status">
          <span>CURRENT STATUS:</span>
          <StatusBadge status={order?.status || 'ORDER_RECEIVED'} blacklisted={order?.isBlacklisted} />
        </div>
      </div>

      {readOnlyMessage && <div className="orders-form-notice">{readOnlyMessage}</div>}
      {error && <div className="orders-form-error">{error}</div>}

      <div className="orders-form-grid">
        <label>
          Recipient Name
          <input value={form.recipientName} onChange={(event) => setField('recipientName', event.target.value)} placeholder="Recipient Name" disabled={readOnly} />
        </label>
        <label>
          Sender Name
          <input value={form.senderName} onChange={(event) => setField('senderName', event.target.value)} placeholder="Sender Name" disabled={readOnly} />
        </label>
        <label>
          City
          <input value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder="City" disabled={readOnly} />
        </label>
        <label>
          Weight (kg)
          <input
            value={form.weightKg}
            onChange={(event) => setField('weightKg', event.target.value)}
            placeholder="Weight (kg)"
            type="number"
            step="0.001"
            disabled={readOnly || isWeightLocked}
          />
        </label>
        <label>
          Address
          <input value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Address" disabled={readOnly} />
        </label>
        <label>
          No. of Pieces
          <input value={form.numberOfPieces} onChange={(event) => setField('numberOfPieces', event.target.value)} placeholder="No. of Pieces" type="number" disabled={readOnly} />
        </label>
        <label>
          Amount
          <input value={form.amount} onChange={(event) => setField('amount', event.target.value)} placeholder="Amount" type="number" disabled={readOnly} />
        </label>
        <label>
          Date
          <input value={form.date} onChange={(event) => setField('date', event.target.value)} type="date" disabled={readOnly} />
        </label>
        <label>
          Phone Number
          <input value={form.phoneNumber} onChange={(event) => setField('phoneNumber', event.target.value)} placeholder="Phone Number" disabled={readOnly} />
        </label>
        <div className="orders-fragile-field">
          <span>Fragile:</span>
          <button
            type="button"
            className={`orders-toggle ${form.fragile ? 'active' : ''}`}
            onClick={() => setField('fragile', !form.fragile)}
            aria-pressed={form.fragile}
            disabled={readOnly}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="orders-form-actions">
        <button type="button" className="orders-btn orders-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        {!readOnly && <button type="submit" className="orders-btn orders-btn-primary" disabled={saving}>
          {saving ? <Spinner size={20} /> : mode === 'create' ? 'Create Order' : 'Save Changes'}
        </button>}
      </div>
    </form>
  );
};

export default OrderForm;
