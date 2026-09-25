import { apiClient, authClient, platformClient, getCompanyId, getUserRole } from "@/lib/api/client";

// Geriye dönük uyumluluk: mevcut ekranlar ana barrel üzerinden import etmeye devam edebilir.
export { candidateApi } from "@/lib/api/candidate-api";
export { candidateProcessApi } from "@/lib/api/process-api";
export { departmentApi } from "@/lib/api/department-api";
export { positionApi } from "@/lib/api/position-api";
export { pipelineApi } from "@/lib/api/pipeline-api";
export { authApi, platformAuthApi } from "@/lib/api/auth-api";

// --- Types ---

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// Liste endpointlerinin eski dizi ve yeni sayfalı yanıtlarını geçiş sürecinde güvenle destekler.
function unwrapCollection<T>(data: T[] | PageData<T>): T[] {
  return Array.isArray(data) ? data : data.content;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface AuthenticatedUser {
  id: number;
  companyId: number;
  companyCode: string;
  fullName: string;
  email: string;
  departmentId: number | null;
  roles: string[];
  permissions: string[];
  roleNames?: Record<string, string>;
}

export interface PlatformAdminResponse {
  id: number;
  fullName: string;
  email: string;
}

// --- Company Types ---

export interface CompanyResponse {
  id: number;
  name: string;
  code: string;
  status: string;
  active: boolean;
}

export interface CreatedCompanyResponse {
  company: CompanyResponse;
  companyAdmin: InitialUser;
}

export interface InitialUser {
  id: number;
  fullName: string;
  email: string;
  roleCode: string;
}

export interface CreateCompanyRequest {
  name: string;
  code: string;
  companyAdmin: {
    firstName: string;
    lastName: string;
    email: string;
    temporaryPassword: string;
  };
}

// --- Candidate Types ---

export interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  linkedinUrl: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  currentCompany: string | null;
  currentJobTitle: string | null;
  noticePeriodDays: number | null;
  active: boolean;
}

export interface CandidateCv {
  id: number;
  candidateId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface CandidateProcessSummary {
  id: number;
  positionId: number;
  positionTitle: string;
  departmentId: number;
  departmentName: string;
  pipelineId: number;
  pipelineName: string;
  currentStageId: number;
  currentStageName: string;
  currentStageType: "ACTIVE" | "HIRED" | "REJECTED" | "ON_HOLD";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateStageHistory {
  id: number;
  fromStageId: number | null;
  fromStageName: string | null;
  toStageId: number;
  toStageName: string;
  reason: string | null;
  changedAt: string;
  changedBy: number | null;
}

export interface CandidateDetail {
  candidate: Candidate;
  processes: CandidateProcessSummary[];
}

export interface CandidateCard {
  candidateProcessId: number;
  candidateId: number;
  fullName: string;
  linkedinUrl: string | null;
}

// --- Position Types ---

export interface Position {
  id: number;
  departmentId: number;
  departmentName: string;
  title: string;
  code: string;
  description: string | null;
  vacancyCount: number;
  status: "OPEN" | "ON_HOLD" | "CLOSED" | "CANCELLED";
  openedAt: string | null;
  closedAt: string | null;
  active: boolean;
}

export interface PositionSummary {
  id: number;
  title: string;
  code: string;
}

// --- Department Types ---

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}

// --- Pipeline Types ---

export interface PipelineStage {
  id: number;
  name: string;
  code: string;
  displayOrder: number;
  stageType: "ACTIVE" | "HIRED" | "REJECTED" | "ON_HOLD";
  active: boolean;
  description?: string | null;
}

// Summary DTO (from GET /pipelines — no stages)
export interface PipelineSummary {
  id: number;
  name: string;
  code: string;
  description: string | null;
  defaultPipeline: boolean;
}

// Detail DTO (from GET /pipelines/:id — includes stages)
export interface Pipeline {
  id: number;
  name: string;
  code: string;
  description: string | null;
  defaultPipeline: boolean;
  active: boolean;
  stages: PipelineStage[];
}

export interface PipelineBoardStage {
  id: number;
  name: string;
  code: string;
  displayOrder: number;
  stageType: string;
  candidates: CandidateCard[];
}

export interface PipelineBoard {
  pipelineId: number;
  pipelineName: string;
  positionId: number;
  positionTitle: string;
  stages: PipelineBoardStage[];
}

export interface CandidateCompensation {
  candidateProcessId: number;
  currentSalary: number | null;
  expectedSalary: number | null;
  offeredSalary: number | null;
  salaryCurrency: string | null;
}

export interface UpdateCandidateCompensationRequest {
  currentSalary: number | null;
  expectedSalary: number | null;
  offeredSalary: number | null;
  salaryCurrency: string | null;
}

// --- Dashboard Types ---

export interface DashboardSummary {
  activeCandidateCount: number;
  openPositionCount: number;
  activeProcessCount: number;
  upcomingInterviewCount: number;
  pendingFollowUpCount: number;
  overdueFollowUpCount: number;
}

export interface StageDistribution {
  stageId: number;
  stageName: string;
  stageCode: string;
  displayOrder: number;
  stageType: "ACTIVE" | "HIRED" | "REJECTED" | "ON_HOLD";
  candidateCount: number;
}

export interface DashboardData {
  generatedAt: string;
  summary: DashboardSummary;
  stageDistribution: StageDistribution[];
  weeklyAnalytics: PeriodAnalytics;
  monthlyAnalytics: PeriodAnalytics;
  allTimeAnalytics: PeriodAnalytics;
  monthlyApplicationTrend: MonthlyApplicationTrend[];
  departmentDistribution: DepartmentDistribution[];
}

export interface MonthlyApplicationTrend {
  monthStart: string;
  applicationCount: number;
}

export interface DepartmentDistribution {
  departmentId: number;
  departmentName: string;
  applicationCount: number;
}

export interface PeriodAnalytics {
  periodStart: string;
  newCandidateCount: number;
  newApplicationCount: number;
  openedPositionCount: number;
  hiredCount: number;
  rejectedCount: number;
}

// --- User & Role Types ---

export interface RoleResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  dataScope: string;
  systemRole: boolean;
  permissions: PermissionResponse[];
}

export interface CandidateNote {
  id: number;
  candidateId: number;
  candidateProcessId: number | null;
  pipelineStageId: number | null;
  pipelineStageName: string | null;
  entryType: "NOTE" | "EVALUATION";
  content: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface PermissionResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  displayOrder: number;
}

export interface SaveRoleRequest {
  name: string;
  description?: string;
  dataScope: "COMPANY" | "DEPARTMENT" | "ASSIGNED";
  permissions: string[];
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  departmentId: number | null;
  departmentName: string | null;
  status: string;
  active: boolean;
  roles: RoleResponse[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword: string;
  departmentId: number | null;
  roleIds: number[];
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number | null;
}

export interface UpdateUserRolesRequest {
  roleIds: number[];
}


// --- Platform Company API (Super Admin) ---

export const platformCompanyApi = {
  getAll: async (): Promise<CompanyResponse[]> => {
    const res = await platformClient.get<ApiResponse<CompanyResponse[] | PageData<CompanyResponse>>>("/companies", {
      params: { size: 100 },
    });
    return unwrapCollection(res.data.data);
  },
  getById: async (companyId: number): Promise<CompanyResponse> => {
    const res = await platformClient.get<ApiResponse<CompanyResponse>>(`/companies/${companyId}`);
    return res.data.data;
  },
  create: async (data: CreateCompanyRequest): Promise<CreatedCompanyResponse> => {
    const res = await platformClient.post<ApiResponse<CreatedCompanyResponse>>("/companies", data);
    return res.data.data;
  },
  update: async (companyId: number, data: { name: string }): Promise<CompanyResponse> => {
    const res = await platformClient.put<ApiResponse<CompanyResponse>>(`/companies/${companyId}`, data);
    return res.data.data;
  },
  changeStatus: async (companyId: number, data: { status: string }): Promise<CompanyResponse> => {
    const res = await platformClient.patch<ApiResponse<CompanyResponse>>(`/companies/${companyId}/status`, data);
    return res.data.data;
  },
};

// --- Dashboard API ---

export const dashboardApi = {
  getSummary: async (): Promise<DashboardData> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<DashboardData>>(`/${companyId}/dashboard`);
    return res.data.data;
  },
};




// --- User Management API ---

export const userApi = {
  getAll: async (departmentId?: number): Promise<UserResponse[]> => {
    const companyId = getCompanyId();
    const params: Record<string, any> = {};
    if (departmentId) params.departmentId = departmentId;
    params.size = 200;
    const res = await apiClient.get<ApiResponse<PageData<UserResponse>>>(`/${companyId}/users`, { params });
    return res.data.data.content;
  },
  getById: async (userId: number): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<UserResponse>>(`/${companyId}/users/${userId}`);
    return res.data.data;
  },
  create: async (data: CreateUserRequest): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<UserResponse>>(`/${companyId}/users`, data);
    return res.data.data;
  },
  update: async (userId: number, data: UpdateUserRequest): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.put<ApiResponse<UserResponse>>(`/${companyId}/users/${userId}`, data);
    return res.data.data;
  },
  updateRoles: async (userId: number, data: UpdateUserRolesRequest): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.put<ApiResponse<UserResponse>>(`/${companyId}/users/${userId}/roles`, data);
    return res.data.data;
  },
  deactivate: async (userId: number): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<UserResponse>>(`/${companyId}/users/${userId}/deactivate`);
    return res.data.data;
  },
  activate: async (userId: number): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<UserResponse>>(`/${companyId}/users/${userId}/activate`);
    return res.data.data;
  },
  resetPassword: async (userId: number, temporaryPassword: string): Promise<UserResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<UserResponse>>(
      `/${companyId}/users/${userId}/reset-password`,
      { temporaryPassword },
    );
    return res.data.data;
  },
};

// --- Role API ---

export const roleApi = {
  getAll: async (): Promise<RoleResponse[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<RoleResponse[]>>(`/${companyId}/roles`);
    return res.data.data;
  },
  getPermissions: async (): Promise<PermissionResponse[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<PermissionResponse[]>>(`/${companyId}/roles/permissions`);
    return res.data.data;
  },
  create: async (data: SaveRoleRequest): Promise<RoleResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<RoleResponse>>(`/${companyId}/roles`, data);
    return res.data.data;
  },
  update: async (roleId: number, data: SaveRoleRequest): Promise<RoleResponse> => {
    const companyId = getCompanyId();
    const res = await apiClient.put<ApiResponse<RoleResponse>>(`/${companyId}/roles/${roleId}`, data);
    return res.data.data;
  },
  deactivate: async (roleId: number): Promise<void> => {
    const companyId = getCompanyId();
    await apiClient.patch(`/${companyId}/roles/${roleId}/deactivate`);
  },
};
