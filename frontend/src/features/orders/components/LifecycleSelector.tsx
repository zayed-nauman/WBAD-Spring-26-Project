import { Check, Package, RotateCcw, Truck } from 'lucide-react';

const lifecycleStates = [
  { value: 'ORDER_RECEIVED', label: 'Order Received', icon: Package },
  { value: 'FULFILLMENT', label: 'Fulfilled', icon: Package },
  { value: 'READY_FOR_PICKUP', label: 'Ready For Pickup', icon: Package },
  { value: 'PICKUP_IN_PROGRESS', label: 'Pickup in Progress', icon: Truck },
  { value: 'PICKED_UP', label: 'Picked Up', icon: Truck },
  { value: 'SHIPMENT_DISPATCHED', label: 'Shipment Dispatched', icon: Truck },
  { value: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { value: 'DELIVERED', label: 'Delivered', icon: Check },
  { value: 'RETURNED', label: 'Returned', icon: RotateCcw },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  selectableStatuses?: string[];
};

const LifecycleSelector = ({ value, onChange, selectableStatuses }: Props) => {
  const selectable = selectableStatuses ? new Set(selectableStatuses) : null;

  return (
    <div className="orders-lifecycle-panel">
      <h2>Current Lifecycle State</h2>
      <div className="orders-lifecycle-grid">
        {lifecycleStates.map(({ value: stateValue, label, icon: Icon }) => {
          const disabled = Boolean(selectable && !selectable.has(stateValue));

          return (
            <button
              type="button"
              key={stateValue}
              className={`orders-lifecycle-step ${value === stateValue ? 'active' : ''}`}
              onClick={() => onChange(stateValue)}
              disabled={disabled}
            >
              <span className="orders-lifecycle-icon">
                <Icon size={38} strokeWidth={1.6} />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LifecycleSelector;
