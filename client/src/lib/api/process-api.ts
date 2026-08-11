import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, CandidateCompensation, CandidateStageHistory, PipelineBoard, UpdateCandidateCompensationRequest } from "../api";

export const candidateProcessApi = {
  create: async (data: { firstName: string; lastName: string; linkedinUrl?: string; positionId: number; pipelineId: number }): Promise<any> =>
    (await apiClient.post<ApiResponse<any>>(`/${getCompanyId()}/candidate-processes`, data)).data.data,
  getBoard: async (pipelineId: number, positionId: number): Promise<PipelineBoard> =>
    (await apiClient.get<ApiResponse<PipelineBoard>>(`/${getCompanyId()}/pipelines/${pipelineId}/positions/${positionId}/board`)).data.data,
  changeStage: async (id: number, data: { stageId: number; reason?: string }): Promise<any> =>
    (await apiClient.patch<ApiResponse<any>>(`/${getCompanyId()}/candidate-processes/${id}/stage`, data)).data.data,
  getStageHistory: async (id: number): Promise<CandidateStageHistory[]> =>
    (await apiClient.get<ApiResponse<CandidateStageHistory[]>>(`/${getCompanyId()}/candidate-processes/${id}/stage-history`)).data.data,
  getCompensation: async (id: number): Promise<CandidateCompensation> =>
    (await apiClient.get<ApiResponse<CandidateCompensation>>(`/${getCompanyId()}/candidate-processes/${id}/compensation`)).data.data,
  updateCompensation: async (id: number, data: UpdateCandidateCompensationRequest): Promise<CandidateCompensation> =>
    (await apiClient.put<ApiResponse<CandidateCompensation>>(`/${getCompanyId()}/candidate-processes/${id}/compensation`, data)).data.data,
};
