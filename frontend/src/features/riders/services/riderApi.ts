import axios from 'axios';
import type { Order } from '../../orders/services/orderApi';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({ baseURL: `${apiUrl}/api` });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type Rider = {
  id: number;
  riderNumber: string;
  name: string;
  phone: string;
  phoneNumber: string;
  city: string;
  location: string;
  vehicle: string;
  depotName: string;
  zone: string;
  currentOrderCount: number;
  orderCapacity: number;
  currentWeightKg: number;
  weightCapacityKg: number;
  currentLoad: number;
  maxLoad: number;
  currentWeight: number;
  maxWeight: number;
  distanceKm?: number | null;
  sameZone?: boolean;
  loadLabel?: string;
  weightLabel?: string;
  riderCoordinates?: { latitude: number; longitude: number } | null;
  deliveryCoordinates?: { latitude: number; longitude: number } | null;
  joiningDate?: string;
};

export type RiderPayload = {
  riderNumber?: string;
  riderName: string;
  city: string;
  location: string;
  vehicle: string;
  phoneNumber: string;
  zone: string;
  weightCapacityKg: number | string;
  orderCapacity: number | string;
  joiningDate: string;
};

export type RiderFilters = {
  search?: string;
  city?: string;
  location?: string;
  capacity?: string;
};

export type AssignedOrder = Order & {
  riderAssignment: {
    id: number;
    orderId: number;
    riderId: number;
    assignedAt: string;
    status: string;
    rider: Rider;
  };
};

export type Recommendations = {
  order: Order & { numberOfPieces?: number; zone?: string; amount?: number };
  riders: Rider[];
  skippedCount: number;
};

export const riderApi = {
  async listReadyOrders(filters = {}) {
    const { data } = await client.get<Order[]>('/riders/ready-orders', { params: filters });
    return data;
  },
  async listAssignedOrders(filters: RiderFilters = {}) {
    const { data } = await client.get<AssignedOrder[]>('/riders/assigned-orders', { params: filters });
    return data;
  },
  async getAssignedOrder(orderId: string | number) {
    const { data } = await client.get<AssignedOrder>(`/riders/assigned-orders/${orderId}`);
    return data;
  },
  async getRecommendations(orderId: string | number) {
    const { data } = await client.get<Recommendations>(`/riders/recommendations/${orderId}`);
    return data;
  },
  async assignRider(orderId: string | number, riderId: string | number) {
    const { data } = await client.post('/riders/assign', { orderId, riderId });
    return data;
  },
  async listRiders(filters: RiderFilters = {}) {
    const { data } = await client.get<Rider[]>('/riders', { params: filters });
    return data;
  },
  async getRider(id: string | number) {
    const { data } = await client.get<Rider>(`/riders/${id}`);
    return data;
  },
  async getNextRiderNumber() {
    const { data } = await client.get<{ riderNumber: string }>('/riders/next-number');
    return data.riderNumber;
  },
  async createRider(payload: RiderPayload) {
    const { data } = await client.post('/riders', payload);
    return data.rider;
  },
  async updateRider(id: string | number, payload: RiderPayload) {
    const { data } = await client.put(`/riders/${id}`, payload);
    return data.rider;
  },
  async deleteRider(id: string | number) {
    await client.delete(`/riders/${id}`);
  },
};
