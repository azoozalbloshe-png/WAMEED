import { apiClient } from './api';

export const realEstateService = {
  createProperty: async (data: any) => {
    const response = await apiClient.post<any>('/api/real-estate/properties', data);
    return response.data || response;
  },

  getProperties: async (skip = 0, limit = 100) => {
    const response = await apiClient.get<any>(`/api/real-estate/properties?skip=${skip}&limit=${limit}`);
    return Array.isArray(response) ? response : (response.data || []);
  },

  getProperty: async (id: number) => {
    const response = await apiClient.get<any>(`/api/real-estate/properties/${id}`);
    return response.data || response;
  },

  updateProperty: async (id: number, data: any) => {
    const response = await apiClient.put<any>(`/api/real-estate/properties/${id}`, data);
    return response.data || response;
  },

  deleteProperty: async (id: number) => {
    const response = await apiClient.delete<any>(`/api/real-estate/properties/${id}`);
    return response.data || response;
  },

  getPropertyStats: async (id: number) => {
    const response = await apiClient.get<any>(`/api/real-estate/properties/${id}/stats`);
    return response.data || response;
  },

  createTenant: async (data: any) => {
    const response = await apiClient.post<any>('/api/real-estate/tenants', data);
    return response.data || response;
  },

  calculatesubscription: async (propertyId: number) => {
    const response = await apiClient.get<any>(
      `/api/real-estate/subscription/calculate?property_id=${propertyId}`
    );
    return response.data || response;
  },

  getDashboardStats: async () => {
    try {
      const response = await apiClient.get<any>('/api/real-estate/dashboard/stats');
      return response.data || response;
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { monthlyPayments: 0, activeContracts: 0, managedProperties: 0, tenantsCount: 0 };
    }
  },

  getNotifications: async () => {
    try {
      const response = await apiClient.get<any>('/api/real-estate/notifications');
      return response.data || response;
    } catch (error) {
      return [];
    }
  }
};
