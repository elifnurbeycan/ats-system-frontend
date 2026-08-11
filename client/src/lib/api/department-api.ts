import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, Department, PageData } from "../api";

const unwrap = <T>(data: T[] | PageData<T>) => Array.isArray(data) ? data : data.content;
export const departmentApi = {
  getAll: async (includeInactive = false): Promise<Department[]> => unwrap((await apiClient.get<ApiResponse<Department[] | PageData<Department>>>(
    `/${getCompanyId()}/departments`, { params: { includeInactive, size: 100 } })).data.data),
  getById: async (id: number): Promise<Department> =>
    (await apiClient.get<ApiResponse<Department>>(`/${getCompanyId()}/departments/${id}`)).data.data,
  create: async (data: { name: string; code: string; description?: string }): Promise<Department> =>
    (await apiClient.post<ApiResponse<Department>>(`/${getCompanyId()}/departments`, data)).data.data,
  deactivate: async (id: number): Promise<Department> =>
    (await apiClient.patch<ApiResponse<Department>>(`/${getCompanyId()}/departments/${id}/deactivate`)).data.data,
  activate: async (id: number): Promise<Department> =>
    (await apiClient.patch<ApiResponse<Department>>(`/${getCompanyId()}/departments/${id}/activate`)).data.data,
};
