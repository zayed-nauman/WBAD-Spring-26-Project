import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: `${apiUrl}/api`,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type OrderStatus =
  | 'ORDER_RECEIVED'
  | 'FULFILLMENT'
  | 'READY_FOR_PICKUP'
  | 'PICKUP_IN_PROGRESS'
  | 'PICKED_UP'
  | 'SHIPMENT_DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'BLACKLISTED';

export type Order = {
  id: number;
  trackingNumber: string;
  senderName?: string;
  receiverName: string;
  phoneNumber: string;
  receiverPhone?: string;
  city: string;
  address: string;
  weightKg: number;
  codAmount?: number;
  isFragile: boolean;
  isBlacklisted: boolean;
  status: OrderStatus;
  labelGenerated?: boolean;
  labelGeneratedAt?: string | null;
  createdAt: string;
  numberOfPieces?: number;
};

export type OrderPayload = {
  orderNumber?: string;
  recipientName: string;
  senderName: string;
  city: string;
  weightKg: number | string;
  address: string;
  numberOfPieces: number | string;
  amount: number | string;
  date: string;
  phoneNumber: string;
  fragile: boolean;
};

export type OrderFilters = {
  search?: string;
  city?: string;
  status?: string;
  price?: string;
  sender?: string;
};

export type BlacklistedNumber = {
  id: number;
  phoneNumber: string;
  reason?: string;
};

export const orderApi = {
  async listOrders(filters: OrderFilters = {}) {
    const { data } = await client.get<Order[]>('/orders', { params: filters });
    return data;
  },

  async getOrder(id: string | number) {
    const { data } = await client.get<Order>(`/orders/${id}`);
    return data;
  },

  async getNextOrderNumber() {
    const { data } = await client.get<{ orderNumber: string }>('/orders/next-number');
    return data.orderNumber;
  },

  async createOrder(payload: OrderPayload) {
    const { data } = await client.post('/orders', payload);
    return data.order;
  },

  async updateOrder(id: string | number, payload: OrderPayload) {
    const { data } = await client.put(`/orders/${id}`, payload);
    return data.order;
  },

  async updateStatus(id: string | number, status: string, confirmBlacklisted = true, statusContext?: string) {
    const { data } = await client.patch(`/orders/${id}/status`, { status, confirmBlacklisted, statusContext });
    return data.order;
  },

  async generateLabel(id: string | number) {
    const { data } = await client.put<Blob>(`/orders/${id}/generate-label`, null, { responseType: 'blob' });
    return data;
  },

  async deleteOrder(id: string | number) {
    await client.delete(`/orders/${id}`);
  },

  async listBlacklistedNumbers() {
    const { data } = await client.get<BlacklistedNumber[]>('/blacklisted-numbers');
    return data;
  },

  async addBlacklistedNumber(phoneNumber: string) {
    const { data } = await client.post('/blacklisted-numbers', { phoneNumber });
    return data.entry;
  },

  async bulkAddBlacklistedNumbers(phoneNumbers: string[]) {
    const { data } = await client.post('/blacklisted-numbers/bulk', { phoneNumbers });
    return data;
  },

  async deleteBlacklistedNumber(id: string | number) {
    await client.delete(`/blacklisted-numbers/${id}`);
  },
};
