import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, Candidate, CandidateCv, CandidateDetail, PageData } from "../api";

export const candidateApi = {
  getPage: async (options: { includeInactive?: boolean; page?: number; size?: number; search?: string;
    sortBy?: "name" | "createdAt"; sortDirection?: "asc" | "desc" } = {}): Promise<PageData<Candidate>> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<PageData<Candidate>>>(`/${companyId}/candidates`, { params: {
      includeInactive: options.includeInactive ?? false, page: options.page ?? 0, size: options.size ?? 20,
      search: options.search || undefined, sortBy: options.sortBy ?? "createdAt",
      sortDirection: options.sortDirection ?? "desc",
    }});
    return res.data.data;
  },
  getAll: async (includeInactive = false): Promise<Candidate[]> =>
    (await candidateApi.getPage({ includeInactive, size: 100 })).content,
  getById: async (candidateId: number): Promise<CandidateDetail> => {
    const res = await apiClient.get<ApiResponse<CandidateDetail>>(`/${getCompanyId()}/candidates/${candidateId}`);
    return res.data.data;
  },
  update: async (candidateId: number, data: any): Promise<any> => {
    const res = await apiClient.put<ApiResponse<any>>(`/${getCompanyId()}/candidates/${candidateId}`, data);
    return res.data.data;
  },
  deactivate: async (candidateId: number): Promise<any> =>
    (await apiClient.patch<ApiResponse<any>>(`/${getCompanyId()}/candidates/${candidateId}/deactivate`)).data.data,
  activate: async (candidateId: number): Promise<any> =>
    (await apiClient.patch<ApiResponse<any>>(`/${getCompanyId()}/candidates/${candidateId}/activate`)).data.data,
  getCv: async (candidateId: number): Promise<CandidateCv | null> => {
    try {
      return (await apiClient.get<ApiResponse<CandidateCv>>(`/${getCompanyId()}/candidates/${candidateId}/cv`)).data.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },
  uploadCv: async (candidateId: number, file: File): Promise<CandidateCv> => {
    const form = new FormData();
    form.append("file", file);
    return (await apiClient.post<ApiResponse<CandidateCv>>(`/${getCompanyId()}/candidates/${candidateId}/cv`, form,
      { headers: { "Content-Type": "multipart/form-data" } })).data.data;
  },
  downloadCv: async (candidateId: number, fileName: string): Promise<void> => {
    const res = await apiClient.get(`/${getCompanyId()}/candidates/${candidateId}/cv/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url; link.download = fileName || "cv.pdf"; document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  },
  deleteCv: async (candidateId: number): Promise<void> => {
    await apiClient.delete(`/${getCompanyId()}/candidates/${candidateId}/cv`);
  },
};
