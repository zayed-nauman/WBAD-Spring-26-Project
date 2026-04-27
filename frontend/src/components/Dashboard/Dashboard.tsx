import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import OrderTable from './OrderTable';
import OrderFilters from './OrderFilters';
import BlacklistWarningModal from './BlacklistWarningModal';
import LabelPreviewModal from './LabelPreviewModal';
import StatusUpdateModal from './StatusUpdateModal';
import Spinner from '../Common/Spinner';
import './Dashboard.css';

interface Order {
  id: number;
  trackingNumber: string;
  senderName?: string;
  receiverName: string;
  phoneNumber: string;
  address: string;
  city: string;
  codAmount?: number;
  weightKg: number;
  items: string;
  isFragile: boolean;
  isBlacklisted: boolean;
  status: string;
  fulfillmentResult: string;
  labelGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

type DashboardView = 'list';

const StatCard: React.FC<{ title: string; value: number; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
  <div className="stat-card">
    <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
      {icon}
    </div>
    <div className="stat-info">
      <span className="stat-title">{title}</span>
      <span className="stat-value">{value}</span>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modal states
  const [showBlacklistWarning, setShowBlacklistWarning] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [warningOrderId, setWarningOrderId] = useState<number | null>(null);
  const [warningPhoneNumber, setWarningPhoneNumber] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());
  const userName = localStorage.getItem('userName') || 'User';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Fetch orders on mount and when navigating back
  useEffect(() => {
    fetchOrders();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (location.state?.orderSaved) {
      fetchOrders();
    }
  }, [location.state]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data.data || response.data;
      const ordersArray = Array.isArray(data) ? data : [];
      setOrders(ordersArray);
      setFilteredOrders(ordersArray);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };


  const handlePrintLabel = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      if (order.isBlacklisted) {
        setWarningOrderId(orderId);
        setWarningPhoneNumber(order.phoneNumber);
        setShowBlacklistWarning(true);
      } else {
        setSelectedOrder(order);
        setShowLabelPreview(true);
      }
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setOrders(orders.filter(o => o.id !== orderId));
        setFilteredOrders(filteredOrders.filter(o => o.id !== orderId));
        alert('Order deleted successfully');
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };


  const handlePrintLabelConfirm = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/orders/${selectedOrder.id}/generate-label`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success || response.data.order || response.data.message) {
        // Update orders list with the response
        const updatedOrder = response.data.order || response.data.data || selectedOrder;
        setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
        setFilteredOrders(filteredOrders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
        setSelectedOrder(updatedOrder);
        setShowLabelPreview(false);
        alert('Label generated successfully. Order status updated to Ready for Pickup');
      }
    } catch (error: any) {
      console.error('Error printing label:', error);
      alert('Failed to generate label');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/orders/${selectedOrder.id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const updatedOrder = response.data.data;
        setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
        setFilteredOrders(filteredOrders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
        setSelectedOrder(updatedOrder);
        alert('Order status updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      if (order.isBlacklisted) {
        setWarningOrderId(orderId);
        setWarningPhoneNumber(order.phoneNumber);
        setShowBlacklistWarning(true);
        return;
      }
      setSelectedOrder(order);
      setShowStatusUpdate(true);
    }
  };

  const handleFilterChange = (filters: any) => {
    let filtered = [...orders];

    // Search filter (Tracking, Receiver, Sender, Phone)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.trackingNumber.toLowerCase().includes(searchLower) ||
        o.receiverName.toLowerCase().includes(searchLower) ||
        (o.senderName && o.senderName.toLowerCase().includes(searchLower)) ||
        o.phoneNumber.includes(filters.search)
      );
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter(o => o.city === filters.city);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(o => o.status === filters.status);
    }

    // Sender filter (Specific field)
    if (filters.sender) {
      const senderLower = filters.sender.toLowerCase();
      filtered = filtered.filter(o =>
        o.senderName?.toLowerCase().includes(senderLower)
      );
    }

    // Price filter (Exact match or >= if more intuitive, but let's do exact match for now as user expects results to change)
    if (filters.priceMin) {
      const priceVal = parseFloat(filters.priceMin);
      if (!isNaN(priceVal)) {
        // Use exact match to make it clear it's working
        filtered = filtered.filter(o => (o.codAmount || 0) === priceVal);
      }
    }

    setFilteredOrders(filtered);
  };

  const calculateStats = () => {
    return {
      total: orders.length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      inTransit: orders.filter(o => ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'SHIPMENT_DISPATCHED'].includes(o.status)).length,
      pending: orders.filter(o => ['ORDER_RECEIVED', 'READY_FOR_PICKUP', 'PICKUP_IN_PROGRESS', 'FULFILLMENT', 'PICKED_UP', 'PICKUP_IN_PROGRESS'].includes(o.status)).length
    };
  };

  const stats = calculateStats();
  const cities = [...new Set(orders.map(o => o.city))].filter(Boolean) as string[];
  const statuses = [...new Set(orders.map(o => o.status))].filter(Boolean) as string[];

  return (
    <div className="page-container dashboard-page">
      <div className="page-header">
        <div>
          <h1>Welcome, {userName}!</h1>
          <p>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {currentTime.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="dashboard-stats">
        <StatCard title="Total Orders" value={stats.total} color="var(--brand-navy)" icon={<Package size={24} />} />
        <StatCard title="Delivered" value={stats.delivered} color="var(--status-green)" icon={<CheckCircle size={24} />} />
        <StatCard title="In Transit" value={stats.inTransit} color="var(--status-blue)" icon={<Truck size={24} />} />
        <StatCard title="Pending" value={stats.pending} color="var(--status-orange)" icon={<Clock size={24} />} />
      </div>

      <OrderFilters cities={cities} statuses={statuses} onFilterChange={handleFilterChange} />

      <OrderTable
        orders={filteredOrders}
        onStatusClick={handleStatusClick}
        loading={loading}
      />

      <BlacklistWarningModal
        isOpen={showBlacklistWarning}
        onClose={() => setShowBlacklistWarning(false)}
      />

      <LabelPreviewModal
        isOpen={showLabelPreview}
        order={selectedOrder || undefined}
        onClose={() => setShowLabelPreview(false)}
        onPrint={handlePrintLabelConfirm}
        onModify={() => {
          setShowLabelPreview(false);
          navigate('/orders');
        }}
        isLoading={loading}
      />

      <StatusUpdateModal
        isOpen={showStatusUpdate}
        order={selectedOrder || undefined}
        onClose={() => setShowStatusUpdate(false)}
        onStatusUpdate={handleStatusUpdate}
        isLoading={loading}
      />
    </div>
  );
};

export default Dashboard;
