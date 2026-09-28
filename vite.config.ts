import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, import.meta.dirname, "");
    const required = [
      "VITE_API_URL",
      "VITE_KEYCLOAK_URL",
      "VITE_KEYCLOAK_REALM",
      "VITE_KEYCLOAK_CLIENT_ID",
    ];
    const missing = required.filter(name => !env[name]?.trim());
    if (missing.length > 0) {
      throw new Error(`Üretim build değişkenleri eksik: ${missing.join(", ")}`);
    }
    if (env.VITE_KEYCLOAK_ENABLED !== "true") {
      throw new Error(
        "Üretim build'i için VITE_KEYCLOAK_ENABLED=true olmalıdır."
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      host: "127.0.0.1",
      allowedHosts: ["localhost", "127.0.0.1"],
      fs: { strict: true, deny: ["**/.*"] },
    },
  };
});
