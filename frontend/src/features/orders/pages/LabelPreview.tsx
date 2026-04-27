import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ShippingLabel from '../components/ShippingLabel';
import BlacklistedOrderWarningModal from '../components/BlacklistedOrderWarningModal';
import { orderApi, type Order } from '../services/orderApi';
import '../styles/orders.css';

const canPrintLabel = (order: Order) => ['FULFILLMENT', 'READY_FOR_PICKUP'].includes(order.status);

const LabelPreview = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningAction, setWarningAction] = useState<'modify' | 'label'>('label');

  useEffect(() => {
    orderApi.getOrder(id).then(setOrder);
  }, [id]);

  const handlePrint = async () => {
    if (!order || !canPrintLabel(order)) return;

    if (order.isBlacklisted) {
      setWarningAction('label');
      setWarningOpen(true);
      return;
    }

    setError('');
    setPrinting(true);

    const pdfWindow = window.open('', '_blank');

    try {
      const pdfBlob = await orderApi.generateLabel(id);
      const pdfUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));

      if (pdfWindow) {
        pdfWindow.location.href = pdfUrl;
        window.setTimeout(() => {
          pdfWindow.focus();
          pdfWindow.print();
        }, 800);
      } else {
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = pdfUrl;
        printFrame.onload = () => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        };
        document.body.appendChild(printFrame);
      }

      setOrder((current) => (current ? { ...current, status: 'READY_FOR_PICKUP' } : current));
    } catch (printError: any) {
      pdfWindow?.close();
      setError(printError?.response?.data?.error || printError?.response?.data?.message || 'Failed to generate label PDF.');
    } finally {
      setPrinting(false);
    }
  };

  if (!order) return <div className="orders-page orders-loading">Loading label...</div>;
  const printAllowed = canPrintLabel(order);

  const handleModify = () => {
    if (order.isBlacklisted) {
      setWarningAction('modify');
      setWarningOpen(true);
      return;
    }

    navigate(`/orders/${id}/edit`);
  };

  return (
    <div className="orders-page label-preview-page">
      <h1>Label Preview</h1>
      <p className="orders-page-subtitle">Preview the label of your fulfilled order</p>
      <div className="label-preview-center">
        {error && <div className="orders-form-error">{error}</div>}
        <ShippingLabel order={order} />
        <div className="orders-form-actions label-actions">
          <button type="button" className="orders-btn orders-btn-secondary" onClick={() => navigate('/orders')}>
            Cancel
          </button>
          <button type="button" className="orders-btn orders-btn-outline" onClick={handleModify}>
            Modify Order
          </button>
          <button type="button" className="orders-btn orders-btn-primary" onClick={handlePrint} disabled={printing || !printAllowed}>
            {printing ? 'Generating...' : 'Print Label'}
          </button>
        </div>
        <p className="label-print-note">
          {printAllowed ? <>Printing this label will change order status to <span>Ready for Pickup</span></> : 'Label can be printed only for fulfilled or ready for pickup orders.'}
        </p>
      </div>
      <BlacklistedOrderWarningModal open={warningOpen} action={warningAction} onCancel={() => setWarningOpen(false)} />
    </div>
  );
};

export default LabelPreview;
