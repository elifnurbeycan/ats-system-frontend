function requiredInProduction(
  name: string,
  developmentFallback: string
): string {
  const value = import.meta.env[name]?.trim();
  if (value) return value;
  if (import.meta.env.PROD) {
    throw new Error(`${name} üretim ortamında tanımlanmalıdır.`);
  }
  return developmentFallback;
}

export const runtimeConfig = {
  apiUrl: requiredInProduction("VITE_API_URL", "http://localhost:8080"),
  keycloakUrl: requiredInProduction(
    "VITE_KEYCLOAK_URL",
    "http://localhost:8081"
  ),
  keycloakRealm: requiredInProduction("VITE_KEYCLOAK_REALM", "ats"),
  keycloakClientId: requiredInProduction(
    "VITE_KEYCLOAK_CLIENT_ID",
    "ats-frontend"
  ),
  keycloakEnabled: import.meta.env.VITE_KEYCLOAK_ENABLED === "true",
} as const;
