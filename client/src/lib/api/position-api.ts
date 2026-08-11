import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, PageData, Position, PositionSummary } from "../api";

const unwrap = <T>(data: T[] | PageData<T>) => Array.isArray(data) ? data : data.content;
export const positionApi = {
  getAll: async (departmentId?: number, status?: string): Promise<Position[]> => {
    const params: Record<string, any> = { size: 100 };
    if (departmentId) params.departmentId = departmentId;
    if (status) params.status = status;
    return unwrap((await apiClient.get<ApiResponse<Position[] | PageData<Position>>>(`/${getCompanyId()}/positions`, { params })).data.data);
  },
  getOpen: async (): Promise<PositionSummary[]> =>
    (await apiClient.get<ApiResponse<PositionSummary[]>>(`/${getCompanyId()}/positions/open`)).data.data,
  getById: async (id: number): Promise<Position> =>
    (await apiClient.get<ApiResponse<Position>>(`/${getCompanyId()}/positions/${id}`)).data.data,
  create: async (data: any): Promise<Position> =>
    (await apiClient.post<ApiResponse<Position>>(`/${getCompanyId()}/positions`, data)).data.data,
  update: async (id: number, data: any): Promise<Position> =>
    (await apiClient.put<ApiResponse<Position>>(`/${getCompanyId()}/positions/${id}`, data)).data.data,
  changeStatus: async (id: number, status: string): Promise<Position> =>
    (await apiClient.patch<ApiResponse<Position>>(`/${getCompanyId()}/positions/${id}/status`, { status })).data.data,
};
