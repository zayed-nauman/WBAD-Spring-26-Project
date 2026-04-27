import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../components/OrderForm';
import { orderApi, type OrderPayload } from '../services/orderApi';
import '../styles/orders.css';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('SWF-00001');

  useEffect(() => {
    orderApi.getNextOrderNumber().then(setOrderNumber).catch(() => undefined);
  }, []);

  const handleSubmit = async (payload: OrderPayload) => {
    await orderApi.createOrder({ ...payload, orderNumber });
    navigate('/orders', { replace: true, state: { orderSaved: true } });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Create a New Order Entry</h1>
          <p>Create a new order manually to be added amongst your existing orders or cancel to return back to orders page.</p>
        </div>
      </div>
      <OrderForm mode="create" orderNumber={orderNumber} onSubmit={handleSubmit} onCancel={() => navigate('/orders')} />
    </div>
  );
};

export default CreateOrder;
