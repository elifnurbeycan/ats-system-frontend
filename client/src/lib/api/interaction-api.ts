import { apiClient, getCompanyId } from "./client";
import type { ApiResponse, PageData } from "../api";

export type InteractionChannel = "LINKEDIN" | "EMAIL" | "PHONE" | "WHATSAPP" | "OTHER";
export type InteractionDirection = "OUTBOUND" | "INBOUND";

export interface InteractionRecord {
  id: number;
  candidateId: number;
  candidateProcessId: number | null;
  channel: InteractionChannel;
  direction: InteractionDirection;
  occurredAt: string;
  subject: string | null;
  summary: string;
  createdAt: string;
}

export interface CreateInteractionInput {
  candidateProcessId?: number | null;
  channel: InteractionChannel;
  direction: InteractionDirection;
  subject?: string;
  summary: string;
}

export const interactionApi = {
  getByCandidate: async (candidateId: number, page = 0, size = 20): Promise<PageData<InteractionRecord>> =>
    (await apiClient.get<ApiResponse<PageData<InteractionRecord>>>(
      `/${getCompanyId()}/candidates/${candidateId}/interactions`,
      { params: { page, size } },
    )).data.data,

  create: async (candidateId: number, input: CreateInteractionInput): Promise<InteractionRecord> =>
    (await apiClient.post<ApiResponse<InteractionRecord>>(
      `/${getCompanyId()}/candidates/${candidateId}/interactions`, input,
    )).data.data,
};
