import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, PageData, Pipeline, PipelineSummary } from "../api";

const unwrap = <T>(data: T[] | PageData<T>) => Array.isArray(data) ? data : data.content;
export const pipelineApi = {
  getAll: async (): Promise<PipelineSummary[]> => unwrap((await apiClient.get<ApiResponse<PipelineSummary[] | PageData<PipelineSummary>>>(
    `/${getCompanyId()}/pipelines`, { params: { size: 100 } })).data.data),
  getById: async (id: number): Promise<Pipeline> =>
    (await apiClient.get<ApiResponse<Pipeline>>(`/${getCompanyId()}/pipelines/${id}`)).data.data,
  create: async (data: any): Promise<Pipeline> =>
    (await apiClient.post<ApiResponse<Pipeline>>(`/${getCompanyId()}/pipelines`, data)).data.data,
  update: async (id: number, data: { name: string; description?: string; defaultPipeline: boolean }): Promise<Pipeline> =>
    (await apiClient.put<ApiResponse<Pipeline>>(`/${getCompanyId()}/pipelines/${id}`, data)).data.data,
  updateStage: async (pipelineId: number, stageId: number, data: { name: string; description?: string; stageType: string }) =>
    (await apiClient.put<ApiResponse<unknown>>(`/${getCompanyId()}/pipelines/${pipelineId}/stages/${stageId}`, data)).data.data,
  addStage: async (pipelineId: number, data: { name: string; code: string; description?: string; displayOrder: number; stageType: string }) =>
    (await apiClient.post<ApiResponse<unknown>>(`/${getCompanyId()}/pipelines/${pipelineId}/stages`, data)).data.data,
  deleteStage: async (pipelineId: number, stageId: number) =>
    (await apiClient.patch<ApiResponse<unknown>>(`/${getCompanyId()}/pipelines/${pipelineId}/stages/${stageId}/deactivate`)).data.data,
  deactivate: async (id: number): Promise<Pipeline> =>
    (await apiClient.patch<ApiResponse<Pipeline>>(`/${getCompanyId()}/pipelines/${id}/deactivate`)).data.data,
};
