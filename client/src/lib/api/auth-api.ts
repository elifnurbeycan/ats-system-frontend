import { authClient } from "./client";
import type { ApiResponse, AuthenticatedUser, PlatformAdminResponse } from "../api";

export const authApi = {
  me: async (): Promise<AuthenticatedUser> => (await authClient.get<ApiResponse<AuthenticatedUser>>("/me")).data.data,
};

export const platformAuthApi = {
  me: async (): Promise<PlatformAdminResponse> =>
    (await authClient.get<ApiResponse<PlatformAdminResponse>>("/platform/me")).data.data,
};
