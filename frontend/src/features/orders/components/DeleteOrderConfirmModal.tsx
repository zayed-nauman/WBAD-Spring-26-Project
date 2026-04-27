type Props = {
  open: boolean;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const DeleteOrderConfirmModal = ({ open, deleting = false, onCancel, onConfirm }: Props) => {
  if (!open) return null;

  return (
    <div className="orders-modal-backdrop">
      <div className="orders-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-order-warning-title">
        <h2 id="delete-order-warning-title">
          <span aria-hidden="true">▲</span> Warning!
        </h2>
        <p>You are deleting an order. Cancel to return or confirm deleting the order.</p>
        <div className="orders-delete-modal-actions">
          <button type="button" className="orders-btn orders-btn-outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="orders-btn orders-btn-primary" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteOrderConfirmModal;
