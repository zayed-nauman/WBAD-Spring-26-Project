type Props = {
  open: boolean;
  onCancel: () => void;
  action?: 'modify' | 'status' | 'label';
};

const messages = {
  modify: 'You are modifying a blacklisted order. Cancel to return or delete the order.',
  status: 'You are changing the status of a blacklisted order. Cancel to return or delete the order.',
  label: 'You are printing a label for a blacklisted order. Cancel to return or delete the order.',
};

const BlacklistedOrderWarningModal = ({ open, onCancel, action = 'modify' }: Props) => {
  if (!open) return null;

  return (
    <div className="orders-modal-backdrop">
      <div className="orders-warning-modal" role="dialog" aria-modal="true" aria-labelledby="blacklisted-warning-title">
        <h2 id="blacklisted-warning-title">
          <span aria-hidden="true">▲</span> Warning!
        </h2>
        <p>{messages[action]}</p>
        <div className="orders-modal-actions">
          <button type="button" className="orders-btn orders-btn-primary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlacklistedOrderWarningModal;
