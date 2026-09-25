import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  keycloak,
  keycloakEnabled,
  logoutFromKeycloak,
  saveKeycloakSession,
} from "../keycloak";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function getCompanyId(): string {
  const direct = sessionStorage.getItem("company_id");
  if (direct) return direct;

  const raw = sessionStorage.getItem("user_data");
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user.companyId) return String(user.companyId);
    } catch {
      // Bozuk oturum verisiyle şirket seçilmez.
    }
  }
  throw new Error("Aktif şirket bilgisi bulunamadı. Lütfen yeniden giriş yapın.");
}

export function getUserRole(): string | null {
  const raw = sessionStorage.getItem("user_data");
  if (!raw) return null;
  try {
    return JSON.parse(raw).role || null;
  } catch {
    return null;
  }
}

function createClient(baseURL: string, loginPath: "/login" | "/admin-login"): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    if (keycloak.token) config.headers.Authorization = `Bearer ${keycloak.token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const originalRequest = error.config as
          | (InternalAxiosRequestConfig & { _keycloakRetry?: boolean })
          | undefined;

        if (
          keycloakEnabled &&
          keycloak.authenticated &&
          originalRequest &&
          !originalRequest._keycloakRetry
        ) {
          originalRequest._keycloakRetry = true;
          try {
            await keycloak.updateToken(30);
            saveKeycloakSession();
            if (keycloak.token) {
              originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
              return client(originalRequest);
            }
          } catch {
            // Token yenilenemezse aşağıdaki merkezi oturum kapatma akışı çalışır.
          }
        }

        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/admin-login") {
          void logoutFromKeycloak(`${window.location.origin}${loginPath}`);
        }
      }
      return Promise.reject(error);
    },
  );
  return client;
}

export const authClient = createClient(`${API_URL}/api/v1/auth`, "/login");
export const platformClient = createClient(`${API_URL}/api/v1/platform`, "/admin-login");
export const apiClient = createClient(`${API_URL}/api/v1/companies`, "/login");
export const systemClient = createClient(`${API_URL}/api/v1`, "/login");
