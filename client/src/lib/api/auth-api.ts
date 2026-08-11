import { authClient } from "./client";
import type { ApiResponse, AuthenticatedUser, PlatformAdminResponse, TokenResponse } from "../api";

export const authApi = {
  login: async (companyCode: string, email: string, password: string): Promise<TokenResponse> =>
    (await authClient.post<ApiResponse<TokenResponse>>("/login", { companyCode, email, password })).data.data,
  me: async (): Promise<AuthenticatedUser> => (await authClient.get<ApiResponse<AuthenticatedUser>>("/me")).data.data,
  refresh: async (refreshToken: string): Promise<TokenResponse> =>
    (await authClient.post<ApiResponse<TokenResponse>>("/refresh", { refreshToken })).data.data,
  logout: async (refreshToken: string): Promise<void> => { await authClient.post("/logout", { refreshToken }); },
};

export const platformAuthApi = {
  login: async (email: string, password: string): Promise<TokenResponse> =>
    (await authClient.post<ApiResponse<TokenResponse>>("/platform/login", { email, password })).data.data,
  me: async (): Promise<PlatformAdminResponse> =>
    (await authClient.get<ApiResponse<PlatformAdminResponse>>("/platform/me")).data.data,
  refresh: async (refreshToken: string): Promise<TokenResponse> =>
    (await authClient.post<ApiResponse<TokenResponse>>("/platform/refresh", { refreshToken })).data.data,
  logout: async (refreshToken: string): Promise<void> => { await authClient.post("/platform/logout", { refreshToken }); },
};
