import { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Candidates from "./pages/Candidates";
import CandidateDetail from "./pages/CandidateDetail";
import Positions from "./pages/Positions";
import PositionDetail from "./pages/PositionDetail";
import Departments from "./pages/Departments";
import Pipelines from "./pages/Pipelines";
import Communications from "./pages/Communications";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CompanyDetail from "./pages/CompanyDetail";
import NotFound from "./pages/NotFound";
import { keycloak } from "./lib/keycloak";

function AuthGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const [location, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = keycloak.authenticated;
    const userData = sessionStorage.getItem("user_data");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (requiredRole === "PLATFORM_ADMIN") {
        if (user.role !== "PLATFORM_ADMIN") {
          navigate("/");
          return;
        }
      } else {
        // Company-scoped routes: platform admins are not allowed here
        if (user.role === "PLATFORM_ADMIN") {
          navigate("/admin");
          return;
        }
      }
    } catch {
      navigate("/login");
      return;
    }

    setIsAuthorized(true);
    setAuthChecked(true);
  }, [location, navigate, requiredRole]);

  if (!authChecked) return null;
  if (!isAuthorized) return null;

  return <>{children}</>;
}

function AppRouter() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/admin-login" component={AdminLogin} />

      {/* Super Admin routes */}
      <Route path="/admin">
        <AuthGuard requiredRole="PLATFORM_ADMIN">
          <SuperAdminDashboard />
        </AuthGuard>
      </Route>
      <Route path="/admin/companies/:id">
        {(params) => (
          <AuthGuard requiredRole="PLATFORM_ADMIN">
            <CompanyDetail companyId={parseInt(params.id)} />
          </AuthGuard>
        )}
      </Route>

      {/* Company-scoped routes */}
      <Route path="/">
        <AuthGuard>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/adaylar">
        <AuthGuard>
          <DashboardLayout>
            <Candidates />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/adaylar/:id">
        {() => (
          <AuthGuard>
            <DashboardLayout>
              <CandidateDetail />
            </DashboardLayout>
          </AuthGuard>
        )}
      </Route>
      <Route path="/iletisim">
        <AuthGuard>
          <DashboardLayout>
            <Communications />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/pozisyonlar">
        <AuthGuard>
          <DashboardLayout>
            <Positions />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/pozisyonlar/:id">
        {() => (
          <AuthGuard>
            <DashboardLayout>
              <PositionDetail />
            </DashboardLayout>
          </AuthGuard>
        )}
      </Route>
      <Route path="/departmanlar">
        <AuthGuard>
          <DashboardLayout>
            <Departments />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/ise-alim-sureci">
        <AuthGuard>
          <DashboardLayout>
            <Pipelines />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/kullanicilar">
        <AuthGuard>
          <DashboardLayout>
            <Users />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/roller">
        <AuthGuard>
          <DashboardLayout>
            <Roles />
          </DashboardLayout>
        </AuthGuard>
      </Route>
      <Route path="/ayarlar">
        <AuthGuard>
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
