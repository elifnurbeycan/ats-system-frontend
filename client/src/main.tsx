import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeKeycloak } from "./lib/keycloak";

initializeKeycloak()
  .catch((error) => console.error("Keycloak başlatılamadı", error))
  .finally(() => createRoot(document.getElementById("root")!).render(<App />));
