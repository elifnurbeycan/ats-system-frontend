import { useEffect, useMemo, useState } from "react";
import { Building2, LockKeyhole, Shield, User, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import { departmentApi, type AuthenticatedUser } from "@/lib/api";

type TabId = "profile" | "security" | "organization" | "api";

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Şirket yöneticisi",
  HR: "İnsan kaynakları",
  RECRUITER: "İşe alım uzmanı",
  GENERAL_MANAGER: "Genel müdür",
  DEPARTMENT_MANAGER: "Departman yöneticisi",
  HIRING_MANAGER: "İşe alım yöneticisi",
  INTERVIEWER: "Görüşmeci",
};

function getStoredUser(): AuthenticatedUser | null {
  try {
    const raw = sessionStorage.getItem("user_data");
    return raw ? (JSON.parse(raw) as AuthenticatedUser) : null;
  } catch {
    return null;
  }
}

export default function Settings() {
  const user = useMemo(getStoredUser, []);
  const isCompanyAdmin = Boolean(user?.roles?.includes("COMPANY_ADMIN"));
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [departmentName, setDepartmentName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.departmentId) return;

    let active = true;
    departmentApi.getById(user.departmentId)
      .then((department) => {
        if (active) setDepartmentName(department.name);
      })
      .catch(() => {
        if (active) setDepartmentName(null);
      });

    return () => {
      active = false;
    };
  }, [user?.departmentId]);

  const tabs = [
    { id: "profile" as const, label: "Profilim", icon: User },
    { id: "security" as const, label: "Güvenlik", icon: Shield },
    ...(isCompanyAdmin
      ? [
          { id: "organization" as const, label: "Şirket", icon: Building2 },
          { id: "api" as const, label: "API ve webhook", icon: Webhook },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Ayarlar</h1>
        <p className="page-description">
          {isCompanyAdmin ? "Kişisel ve şirket ayarlarınızı yönetin." : "Kişisel tercihlerinizi ve hesap bilgilerinizi görüntüleyin."}
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <nav className="shrink-0 lg:w-56" aria-label="Ayar kategorileri">
          <div className="enterprise-panel flex gap-1 overflow-x-auto p-1.5 lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="enterprise-panel min-w-0 flex-1 p-5 sm:p-6">
          {activeTab === "profile" && (
            <SettingsSection title="Profilim" description="Bu bilgiler hesabınız ve yetkilerinizden alınır.">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Ad soyad" value={user?.fullName || "—"} />
                <ReadOnlyField label="E-posta" value={user?.email || "—"} />
                <ReadOnlyField
                  label="Rol"
                  value={(user?.roles || []).map((role) => ROLE_LABELS[role] || role).join(", ") || "—"}
                />
                <ReadOnlyField
                  label="Departman"
                  value={user?.departmentId ? departmentName || `Departman #${user.departmentId}` : "Atanmamış"}
                />
              </div>
              <InfoNotice>
                Profil ve rol değişiklikleri yetkili şirket yöneticiniz tarafından yapılır.
              </InfoNotice>
            </SettingsSection>
          )}

          {activeTab === "security" && (
            <SettingsSection title="Güvenlik" description="Oturum ve hesap güvenliği bilgileri.">
              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Aktif oturum</p>
                  <p className="mt-1 text-sm text-muted-foreground">Bu oturum tarayıcı kapatılana veya çıkış yapılana kadar geçerlidir.</p>
                </div>
              </div>
              <InfoNotice>Şifre değiştirme işlemleri şu anda şirket yöneticiniz tarafından yürütülmektedir.</InfoNotice>
            </SettingsSection>
          )}

          {isCompanyAdmin && activeTab === "organization" && (
            <SettingsSection title="Şirket Bilgileri" description="Yalnızca şirket yöneticilerinin görebildiği kurumsal bilgiler.">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Şirket kodu" value={user?.companyCode || "—"} />
                <ReadOnlyField label="Şirket kimliği" value={user?.companyId ? String(user.companyId) : "—"} />
              </div>
            </SettingsSection>
          )}

          {isCompanyAdmin && activeTab === "api" && (
            <SettingsSection title="API & Webhook" description="Teknik entegrasyon bilgileri yalnızca şirket yöneticilerine açıktır.">
              <ReadOnlyField label="API adresi" value={import.meta.env.VITE_API_URL || "Yapılandırılmamış"} />
              <InfoNotice>Webhook yönetimi henüz etkinleştirilmemiştir.</InfoNotice>
            </SettingsSection>
          )}

        </main>
      </div>
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <header className="border-b border-border pb-4">
        <h2 className="section-title">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="min-h-10 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

function InfoNotice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-sm text-blue-800">{children}</div>;
}
