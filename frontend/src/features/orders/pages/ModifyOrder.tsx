import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrderForm from '../components/OrderForm';
import { orderApi, type Order, type OrderPayload } from '../services/orderApi';
import Spinner from '../../../components/Common/Spinner';
import '../styles/orders.css';

const ModifyOrder = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>();

  useEffect(() => {
    orderApi.getOrder(id).then(setOrder);
  }, [id]);

  const handleSubmit = async (payload: OrderPayload) => {
    await orderApi.updateOrder(id, payload);
    navigate('/orders', { replace: true, state: { orderSaved: true } });
  };

  if (!order) return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Spinner size={40} />
    </div>
  );

  const readOnly = Boolean(order.labelGenerated);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Modify Order Entry</h1>
          <p>{readOnly ? 'This order can no longer be edited.' : 'Make changes to existing order or cancel to return back to orders page.'}</p>
        </div>
      </div>
      <OrderForm
        mode="edit"
        order={order}
        orderNumber={order.trackingNumber}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/orders')}
        readOnly={readOnly}
        readOnlyMessage={readOnly ? 'This order can no longer be modified. The order has already been processed for pickup' : undefined}
      />
    </div>
  );
};

export default ModifyOrder;
