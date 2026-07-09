import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { DashboardStats } from '@/types/dashboard.types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard');
    return data.data;
  },
};
