import Keycloak, { type KeycloakInstance } from "keycloak-js";

const enabled = import.meta.env.VITE_KEYCLOAK_ENABLED === "true";

export const keycloakEnabled = enabled;
export const keycloak: KeycloakInstance = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8081",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "ats",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "ats-frontend",
});

export function saveKeycloakSession() {
  if (!keycloak.token || !keycloak.tokenParsed) return;
  const rawRoles = (keycloak.tokenParsed.realm_access?.roles as string[] | undefined) ?? [];
  const roles = rawRoles.filter((role) =>
    role !== "offline_access" && role !== "uma_authorization" && !role.startsWith("default-roles-"));
  const isPlatformAdmin = roles.includes("SUPER_ADMIN");
  // keycloak-js access/refresh tokenlarını bellekte yönetir. Tokenı
  // sessionStorage'a kopyalamak XSS durumunda token hırsızlığını kolaylaştırır.
  sessionStorage.setItem("user_data", JSON.stringify({
    fullName: keycloak.tokenParsed.name || keycloak.tokenParsed.preferred_username || "Keycloak User",
    email: keycloak.tokenParsed.email || "",
    role: isPlatformAdmin ? "PLATFORM_ADMIN" : roles[0] || null,
    roles,
  }));
}

async function loadBackendUserSession() {
  if (!keycloak.token || !keycloak.tokenParsed) return;
  const roles = (keycloak.tokenParsed.realm_access?.roles as string[] | undefined) ?? [];
  if (roles.includes("SUPER_ADMIN")) return;

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${keycloak.token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Keycloak kullanıcısı backend ile eşleştirilemedi (${response.status}).`);
  }
  const payload = await response.json();
  const user = payload.data;
  sessionStorage.setItem("company_id", String(user.companyId));
  sessionStorage.setItem("user_data", JSON.stringify(user));
}

export async function initializeKeycloak(): Promise<boolean> {
  if (!enabled) return false;
  const authenticated = await keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });
  if (authenticated) {
    saveKeycloakSession();
    await loadBackendUserSession();
  }
  keycloak.onTokenExpired = async () => {
    try {
      await keycloak.updateToken(30);
      saveKeycloakSession();
    } catch {
      sessionStorage.clear();
    }
  };
  return authenticated;
}

export function loginWithKeycloak(redirectUri = window.location.origin) {
  return keycloak.login({ redirectUri, prompt: "login" });
}

export function logoutFromKeycloak(redirectUri = `${window.location.origin}/login`) {
  sessionStorage.clear();
  return keycloak.logout({ redirectUri });
}
