import { useState } from "react";
import { useLocation } from "wouter";
import { authApi, type AuthenticatedUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, LogIn, Shield, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tokenData = await authApi.login(companyCode, email, password);

      // Token'ları kaydet
      sessionStorage.setItem("auth_token", tokenData.accessToken);
      sessionStorage.setItem("refresh_token", tokenData.refreshToken);

      // Kullanıcı bilgilerini al ve company_id'yi kaydet
      const user: AuthenticatedUser = await authApi.me();
      sessionStorage.setItem("company_id", String(user.companyId));
      sessionStorage.setItem("user_data", JSON.stringify(user));

      toast.success("Giriş başarılı!", {
        description: `Hoş geldiniz, ${user.fullName}`,
      });
      navigate("/");
    } catch (error: any) {
      const message = error.response?.data?.message || "Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin.";
      toast.error("Giriş Hatası", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ATS</h1>
          <p className="text-slate-500 mt-1">Hesabınıza giriş yapın</p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5 text-blue-600" />
              Giriş Yap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyCode">Şirket Kodu</Label>
                <Input
                  id="companyCode"
                  placeholder="Şirket kodunuzu girin"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  required
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                  href="/admin-login"
                  className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Platform Yönetici Girişi
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
