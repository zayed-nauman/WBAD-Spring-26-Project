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
        setOrders(orders.map(o => o.id === selectedOrder.id ? response.data.data : o));
        setFilteredOrders(filteredOrders.map(o => o.id === selectedOrder.id ? response.data.data : o));
        setSelectedOrder(response.data.data);
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
      setSelectedOrder(order);
      setShowStatusUpdate(true);
    }
  };
