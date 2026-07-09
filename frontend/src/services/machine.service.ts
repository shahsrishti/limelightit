import apiClient from '@/lib/axios';
import { ApiResponse, PaginatedResponse } from '@/types/api.types';
import { Machine } from '@/types/dashboard.types';

export interface MachineListParams {
  page?: number;
  limit?: number;
  search?: string;
  factoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const machineService = {
  getMachines: async (params?: MachineListParams) => {
    const { data } = await apiClient.get<PaginatedResponse<Machine>>('/machines', { params });
    return data;
  },

  getMachineById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Machine>>(`/machines/${id}`);
    return data.data;
  },

  getMachineHistory: async (
    id: string,
    params: { from?: string; to?: string; metrics?: string }
  ) => {
    const { data } = await apiClient.get<ApiResponse<unknown>>(
      `/machines/${id}/history`,
      { params }
    );
    return data.data;
  },
};
