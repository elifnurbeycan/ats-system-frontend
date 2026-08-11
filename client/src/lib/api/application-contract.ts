import { systemClient } from "./client";

export interface ApplicationContract {
  version: string;
  candidateCv: { maxFileSizeBytes: number; allowedContentTypes: string[]; allowedExtensions: string[] };
  pagination: { defaultPageSize: number; maxPageSize: number; candidateSortFields: string[]; sortDirections: string[] };
  pipelineStageTypes: string[];
  salaryCurrencies: string[];
}

export const FALLBACK_APPLICATION_CONTRACT: ApplicationContract = {
  version: "fallback",
  candidateCv: { maxFileSizeBytes: 5 * 1024 * 1024, allowedContentTypes: ["application/pdf"], allowedExtensions: [".pdf"] },
  pagination: { defaultPageSize: 20, maxPageSize: 100, candidateSortFields: ["name", "createdAt"], sortDirections: ["asc", "desc"] },
  pipelineStageTypes: ["ACTIVE", "HIRED", "REJECTED", "ON_HOLD"],
  salaryCurrencies: ["TRY", "USD", "EUR", "GBP"],
};

let cachedContract: ApplicationContract | null = null;
let pendingRequest: Promise<ApplicationContract> | null = null;

export async function getApplicationContract(): Promise<ApplicationContract> {
  if (cachedContract) return cachedContract;
  if (!pendingRequest) {
    pendingRequest = systemClient.get<ApplicationContract>("/application-contract")
      .then(({ data }) => (cachedContract = data))
      .catch(() => FALLBACK_APPLICATION_CONTRACT)
      .finally(() => { pendingRequest = null; });
  }
  return pendingRequest;
}

export function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function isAllowedFile(file: File, contract: ApplicationContract["candidateCv"]): boolean {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  return contract.allowedContentTypes.includes(file.type) || contract.allowedExtensions.includes(extension);
}
