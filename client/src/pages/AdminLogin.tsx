import { useState } from "react";
import { useLocation } from "wouter";
import { platformAuthApi, type PlatformAdminResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, LogIn, Eye, EyeOff } from "lucide-react";
import { keycloakEnabled, loginWithKeycloak } from "@/lib/keycloak";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tokenData = await platformAuthApi.login(email, password);

      // Token'ları kaydet
      sessionStorage.setItem("auth_token", tokenData.accessToken);
      sessionStorage.setItem("refresh_token", tokenData.refreshToken);

      // Admin bilgilerini al
      const admin: PlatformAdminResponse = await platformAuthApi.me();
      sessionStorage.setItem("user_data", JSON.stringify({
        fullName: admin.fullName,
        email: admin.email,
        role: "PLATFORM_ADMIN",
      }));

      toast.success("Platform giriş başarılı!", {
        description: `Hoş geldiniz, ${admin.fullName}`,
      });
      navigate("/admin");
    } catch (error: any) {
      const message = error.response?.data?.message || "Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin.";
      toast.error("Giriş Hatası", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Platform Yönetimi</h1>
          <p className="text-blue-200 mt-1">Yönetici hesabına giriş yapın</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LogIn className="w-5 h-5 text-blue-400" />
              Platform Girişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keycloakEnabled ? (
              <Button type="button" className="w-full mb-4" onClick={() => loginWithKeycloak(`${window.location.origin}/admin`)}>
                Keycloak ile giriş yap
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-slate-300">E-posta</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword" className="text-slate-300">Şifre</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : (
                  "Giriş Yap"
                )}
              </Button>

              <div className="text-center pt-2">
                <a
                  href="/login"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Kullanıcı girişine dön
                </a>
              </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
