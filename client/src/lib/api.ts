import axios, { AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// --- Auth Helpers ---

function getAuthToken(): string | null {
  return sessionStorage.getItem("auth_token");
}

function getCompanyId(): string {
  // 1) Direct company_id key (set at login)
  const direct = sessionStorage.getItem("company_id");
  if (direct) return direct;

  // 2) Fallback: parse from user_data (also set at login)
  const raw = sessionStorage.getItem("user_data");
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user.companyId) return String(user.companyId);
    } catch {}
  }

  // 3) Last resort: env var (development only)
  return import.meta.env.VITE_COMPANY_ID || "1";
}

function getUserRole(): string | null {
  const raw = sessionStorage.getItem("user_data");
  if (raw) {
    try {
      const user = JSON.parse(raw);
      return user.role || null;
    } catch {
      return null;
    }
  }
  return null;
}

// --- Auth API Client ---

const authClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1/auth`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

authClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Platform API Client (Super Admin) ---

const platformClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1/platform`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

platformClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

platformClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/admin-login") {
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("company_id");
        sessionStorage.removeItem("user_data");
        window.location.href = "/admin-login";
      }
    }
    return Promise.reject(error);
  }
);

// --- Company-scoped API Client ---

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1/companies`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/admin-login") {
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("company_id");
        sessionStorage.removeItem("user_data");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

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

// --- Auth API ---

export const authApi = {
  login: async (companyCode: string, email: string, password: string): Promise<TokenResponse> => {
    const res = await authClient.post<ApiResponse<TokenResponse>>("/login", {
      companyCode,
      email,
      password,
    });
    return res.data.data;
  },
  me: async (): Promise<AuthenticatedUser> => {
    const res = await authClient.get<ApiResponse<AuthenticatedUser>>("/me");
    return res.data.data;
  },
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await authClient.post<ApiResponse<TokenResponse>>("/refresh", {
      refreshToken,
    });
    return res.data.data;
  },
  logout: async (refreshToken: string): Promise<void> => {
    await authClient.post("/logout", { refreshToken });
  },
};

// --- Platform Admin API (Super Admin) ---

export const platformAuthApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const res = await authClient.post<ApiResponse<TokenResponse>>("/platform/login", {
      email,
      password,
    });
    return res.data.data;
  },
  me: async (): Promise<PlatformAdminResponse> => {
    const res = await authClient.get<ApiResponse<PlatformAdminResponse>>("/platform/me");
    return res.data.data;
  },
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await authClient.post<ApiResponse<TokenResponse>>("/platform/refresh", {
      refreshToken,
    });
    return res.data.data;
  },
  logout: async (refreshToken: string): Promise<void> => {
    await authClient.post("/platform/logout", { refreshToken });
  },
};

// --- Platform Company API (Super Admin) ---

export const platformCompanyApi = {
  getAll: async (): Promise<CompanyResponse[]> => {
    const res = await platformClient.get<ApiResponse<CompanyResponse[]>>("/companies");
    return res.data.data;
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

// --- Candidate API ---

export const candidateApi = {
  getAll: async (): Promise<Candidate[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<{ content: Candidate[] }>>(`/${companyId}/candidates`);
    return res.data.data.content;
  },

  getById: async (candidateId: number): Promise<CandidateDetail> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<CandidateDetail>>(`/${companyId}/candidates/${candidateId}`);
    return res.data.data;
  },

  update: async (candidateId: number, data: any): Promise<any> => {
    const companyId = getCompanyId();
    const res = await apiClient.put<ApiResponse<any>>(`/${companyId}/candidates/${candidateId}`, data);
    return res.data.data;
  },

  deactivate: async (candidateId: number): Promise<any> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<any>>(`/${companyId}/candidates/${candidateId}/deactivate`);
    return res.data.data;
  },
};


// --- Position API ---

export const positionApi = {
  getAll: async (departmentId?: number, status?: string): Promise<Position[]> => {
    const companyId = getCompanyId();
    const params: Record<string, any> = {};
    if (departmentId) params.departmentId = departmentId;
    if (status) params.status = status;
    const res = await apiClient.get<ApiResponse<Position[]>>(`/${companyId}/positions`, { params });
    return res.data.data;
  },
  getOpen: async (): Promise<PositionSummary[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<PositionSummary[]>>(`/${companyId}/positions/open`);
    return res.data.data;
  },
  getById: async (positionId: number): Promise<Position> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<Position>>(`/${companyId}/positions/${positionId}`);
    return res.data.data;
  },
  create: async (data: any): Promise<Position> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<Position>>(`/${companyId}/positions`, data);
    return res.data.data;
  },
  update: async (positionId: number, data: any): Promise<Position> => {
    const companyId = getCompanyId();
    const res = await apiClient.put<ApiResponse<Position>>(`/${companyId}/positions/${positionId}`, data);
    return res.data.data;
  },
  changeStatus: async (positionId: number, status: string): Promise<Position> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<Position>>(`/${companyId}/positions/${positionId}/status`, { status });
    return res.data.data;
  },
};


// --- Department API ---

export const departmentApi = {
  getAll: async (includeInactive: boolean = false): Promise<Department[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<Department[]>>(`/${companyId}/departments`, {
      params: { includeInactive },
    });
    return res.data.data;
  },
  getById: async (departmentId: number): Promise<Department> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<Department>>(`/${companyId}/departments/${departmentId}`);
    return res.data.data;
  },
  create: async (data: { name: string; code: string; description?: string }): Promise<Department> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<Department>>(`/${companyId}/departments`, data);
    return res.data.data;
  },
  deactivate: async (departmentId: number): Promise<Department> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<Department>>(`/${companyId}/departments/${departmentId}/deactivate`);
    return res.data.data;
  },
  activate: async (departmentId: number): Promise<Department> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<Department>>(`/${companyId}/departments/${departmentId}/activate`);
    return res.data.data;
  },
};

// --- Pipeline API ---

export const pipelineApi = {
  getAll: async (): Promise<PipelineSummary[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<PipelineSummary[]>>(`/${companyId}/pipelines`);
    return res.data.data;
  },
  getById: async (pipelineId: number): Promise<Pipeline> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<Pipeline>>(`/${companyId}/pipelines/${pipelineId}`);
    return res.data.data;
  },
  create: async (data: any): Promise<Pipeline> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<Pipeline>>(`/${companyId}/pipelines`, data);
    return res.data.data;
  },
  deactivate: async (pipelineId: number): Promise<Pipeline> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<Pipeline>>(`/${companyId}/pipelines/${pipelineId}/deactivate`);
    return res.data.data;
  },
};

// --- Candidate Process API ---

export const candidateProcessApi = {
  create: async (data: {
    firstName: string;
    lastName: string;
    linkedinUrl?: string;
    positionId: number;
    pipelineId: number;
  }): Promise<any> => {
    const companyId = getCompanyId();
    const res = await apiClient.post<ApiResponse<any>>(`/${companyId}/candidate-processes`, data);
    return res.data.data;
  },
  getBoard: async (pipelineId: number, positionId: number): Promise<PipelineBoard> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<PipelineBoard>>(
      `/${companyId}/pipelines/${pipelineId}/positions/${positionId}/board`
    );
    return res.data.data;
  },
  changeStage: async (candidateProcessId: number, data: { stageId: number; reason?: string }): Promise<any> => {
    const companyId = getCompanyId();
    const res = await apiClient.patch<ApiResponse<any>>(
      `/${companyId}/candidate-processes/${candidateProcessId}/stage`,
      data
    );
    return res.data.data;
  },
  getStageHistory: async (candidateProcessId: number): Promise<CandidateStageHistory[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<any[]>>(
      `/${companyId}/candidate-processes/${candidateProcessId}/stage-history`
    );
    return res.data.data;
  },
  getCompensation: async (candidateProcessId: number): Promise<CandidateCompensation> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<CandidateCompensation>>(
      `/${companyId}/candidate-processes/${candidateProcessId}/compensation`
    );
    return res.data.data;
  },
  updateCompensation: async (
    candidateProcessId: number,
    data: UpdateCandidateCompensationRequest
  ): Promise<CandidateCompensation> => {
    const companyId = getCompanyId();
    const res = await apiClient.put<ApiResponse<CandidateCompensation>>(
      `/${companyId}/candidate-processes/${candidateProcessId}/compensation`,
      data
    );
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
};

// --- Role API ---

export const roleApi = {
  getAll: async (): Promise<RoleResponse[]> => {
    const companyId = getCompanyId();
    const res = await apiClient.get<ApiResponse<RoleResponse[]>>(`/${companyId}/roles`);
    return res.data.data;
  },
};
