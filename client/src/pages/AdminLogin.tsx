import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { keycloakEnabled, loginWithKeycloak } from "@/lib/keycloak";

export default function AdminLogin() {
  useEffect(() => {
    if (keycloakEnabled) void loginWithKeycloak(`${window.location.origin}/admin`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Keycloak yönetici girişine yönlendiriliyor...
      </div>
    </div>
  );
}
