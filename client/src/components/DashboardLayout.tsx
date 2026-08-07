import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  Settings,
  ChevronLeft,
  Search,
  Bell,
  LogOut,
  Menu,
  GitBranch,
  UserCog,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi, type AuthenticatedUser } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

// Rol bazlı menü tanımı
// - COMPANY_ADMIN: Tüm menüler + Kullanıcı Yönetimi
// - RECRUITER (İK): Adaylar, Pozisyonlar, Departmanlar, İşe Alım Süreci, Ayarlar
// - HIRING_MANAGER (Müdür): Adaylar, Pozisyonlar, Departmanlar, İşe Alım Süreci
function getNavItems(role: string) {
  const ALL_ROLES = ["COMPANY_ADMIN", "HR", "RECRUITER", "GENERAL_MANAGER", "DEPARTMENT_MANAGER", "HIRING_MANAGER", "INTERVIEWER"];
  const base = [
    { path: "/", label: "Kontrol Paneli", icon: LayoutDashboard, roles: ALL_ROLES },
    { path: "/adaylar", label: "Adaylar", icon: Users, roles: ALL_ROLES },
    { path: "/pozisyonlar", label: "Pozisyonlar", icon: Briefcase, roles: ALL_ROLES },
    { path: "/departmanlar", label: "Departmanlar", icon: Building2, roles: ALL_ROLES },
    { path: "/ise-alim-sureci", label: "İşe Alım Süreci", icon: GitBranch, roles: ALL_ROLES },
  ];

  // Kullanıcı Yönetimi sadece COMPANY_ADMIN için
  if (role === "COMPANY_ADMIN") {
    base.push({
      path: "/kullanicilar",
      label: "Kullanıcılar",
      icon: UserCog,
      roles: ["COMPANY_ADMIN"],
    });
  }

  // Ayarlar sadece COMPANY_ADMIN ve HR/RECRUITER için
  const SETTINGS_ROLES = [
    "COMPANY_ADMIN",
    "HR",
    "RECRUITER",
    "GENERAL_MANAGER",
    "DEPARTMENT_MANAGER",
  ];
  if (SETTINGS_ROLES.includes(role)) {
    base.push({
      path: "/ayarlar",
      label: "Ayarlar",
      icon: Settings,
      roles: SETTINGS_ROLES,
    });
  }

  return base;
}

function getUserFromStorage(): AuthenticatedUser | null {
  const raw = sessionStorage.getItem("user_data");
  if (raw) {
    try {
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      return null;
    }
  }
  return null;
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(roles: string[]): string {
  if (!roles || roles.length === 0) return "Kullanıcı";
  const role = roles[0];
  switch (role) {
    case "COMPANY_ADMIN": return "Şirket Yöneticisi";
    case "HR": return "İnsan Kaynakları";
    case "RECRUITER": return "İK";
    case "GENERAL_MANAGER": return "Genel Müdür";
    case "DEPARTMENT_MANAGER": return "Departman Yöneticisi";
    case "INTERVIEWER": return "Görüşmeci";
    case "HIRING_MANAGER": return "Yönetici";
    default: return role;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, navigate] = useLocation();
  const [user, setUser] = useState<AuthenticatedUser | null>(getUserFromStorage);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (storedUser && (storedUser as any).role === "PLATFORM_ADMIN") {
      navigate("/admin");
    } else {
      setUser(storedUser);
    }
  }, [location, navigate]);

  const userRole = user?.roles?.[0] || "RECRUITER";
  const navItems = getNavItems(userRole);

  const handleLogout = async () => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Silent fail on logout
    }
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("company_id");
    sessionStorage.removeItem("user_data");
    toast.success("Çıkış yapıldı");
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-40 h-full transition-all duration-300 ease-out",
          "bg-sidebar border-r border-sidebar-border",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "left-0" : "-left-full md:left-0"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <span className="text-primary font-bold text-sm tracking-tight">ATS</span>
            </div>
            {!collapsed && (
              <div className="animate-slide-up">
                <h1 className="font-display text-lg font-bold text-sidebar-foreground">ATS</h1>
                <p className="text-[11px] text-muted-foreground">
                  Aday Takip Sistemi
                </p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                location === item.path ||
                (item.path !== "/" && location.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1 transition-all duration-200",
                    "hover:bg-sidebar-accent",
                    isActive && "bg-sidebar-accent text-primary"
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-600" />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                    )}
                  />
                  {!collapsed && (
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-primary" : "text-sidebar-foreground/75 group-hover:text-sidebar-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle - desktop */}
          <div className="hidden md:block border-t border-sidebar-border p-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  collapsed && "rotate-180"
                )}
              />
              {!collapsed && <span className="text-xs font-medium">Daralt</span>}
            </button>
          </div>

          {/* User */}
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {user ? getInitials(user.fullName) : "???"}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.fullName || "Yükleniyor..."}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {getRoleLabel(user?.roles || [])}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={handleLogout}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Aday, pozisyon ara..."
              className="w-full rounded-xl bg-background border border-border pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
              aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
