/*
 * Super Admin Dashboard - Platform Yöneticisi
 * Şirket oluşturma, listeleme, yönetme
 * code (slug) küçük harfle yazılır
 */
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { keycloak, keycloakEnabled, logoutFromKeycloak } from "@/lib/keycloak";
import { platformCompanyApi, platformAuthApi } from "@/lib/api";
import type { CompanyResponse, CreateCompanyRequest, PlatformAdminResponse } from "@/lib/api";

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adminInfo, setAdminInfo] = useState<PlatformAdminResponse | null>(null);
  const [createForm, setCreateForm] = useState<CreateCompanyRequest>({
    name: "",
    code: "",
    companyAdmin: {
      firstName: "",
      lastName: "",
      email: "",
      temporaryPassword: "",
    },
  });

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformCompanyApi.getAll();
      setCompanies(data);
    } catch (err: any) {
      toast.error("Şirketler yüklenemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    platformAuthApi.me().then(setAdminInfo).catch(console.error);
  }, [loadCompanies]);

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCompany = async () => {
    // Validation
    if (!createForm.name || !createForm.code) {
      toast.error("Şirket adı ve kodu zorunludur");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(createForm.code)) {
      toast.error(
        "Şirket kodu sadece küçük harf, rakam ve kelimeler arasında tek tire (-) içerebilir (örn: acme-yazilim)"
      );
      return;
    }
    const { companyAdmin } = createForm;
    if (
      !companyAdmin.firstName || !companyAdmin.lastName || !companyAdmin.email || !companyAdmin.temporaryPassword
    ) {
      toast.error("Şirket yöneticisi bilgileri zorunludur");
      return;
    }
    if (companyAdmin.temporaryPassword.length < 12) {
      toast.error("Geçici şifre en az 12 karakter olmalıdır");
      return;
    }

    setSubmitting(true);
    try {
      const result = await platformCompanyApi.create(createForm);
      toast.success(
        `"${result.company.name}" şirketi başarıyla oluşturuldu. Şirket yöneticisi hazır.`
      );
      setShowCreateDialog(false);
      setCreateForm({
        name: "",
        code: "",
        companyAdmin: { firstName: "", lastName: "", email: "", temporaryPassword: "" },
      });
      await loadCompanies();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Bilinmeyen hata";
      toast.error("Şirket oluşturulamadı: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (keycloakEnabled && keycloak.authenticated) {
      toast.success("Çıkış yapıldı");
      await logoutFromKeycloak(`${window.location.origin}/admin-login`);
      return;
    }
    sessionStorage.clear();
    window.location.href = "/admin-login";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1e3a5f]">Platform Yönetimi</h1>
              <p className="text-xs text-muted-foreground">Super Admin Paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {adminInfo && (
              <div className="text-sm text-muted-foreground">
                {adminInfo.fullName} ({adminInfo.email})
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1e3a5f]">Şirketler</h2>
            <p className="text-muted-foreground mt-1">
              Toplam {companies.length} şirket kayıtlı
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2a4a6f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Şirket
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Şirket adı veya kodu ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Şirket Adı</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-[#1e3a5f]" />
                          </div>
                          <div className="font-medium">{company.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {company.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {company.active ? (
                          <Badge className="bg-emerald-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Pasif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/companies/${company.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Detay
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Company Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Şirket Oluştur</DialogTitle>
            <DialogDescription>
              Şirket bilgileri, ilk şirket yöneticisi (Company Admin) ile birlikte oluşturulacaktır.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3">Şirket Bilgileri</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Şirket Adı *</label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Örn: Acme Yazılım A.Ş."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Şirket Kodu (slug) *</label>
                  <Input
                    value={createForm.code}
                    onChange={(e) => {
                      const sanitized = e.target.value
                        .toLowerCase()
                        .replace(/_/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-+/g, "-");
                      setCreateForm({ ...createForm, code: sanitized });
                    }}
                    placeholder="Örn: acme-yazilim"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sadece küçük harf, rakam ve kelimeler arasında tek tire (-) kullanabilirsiniz (Örn: acme-yazilim).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Company Admin */}
            <div>
              <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3">
                Şirket Yöneticisi (Company Admin)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Ad *</label>
                  <Input
                    value={createForm.companyAdmin.firstName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        companyAdmin: { ...createForm.companyAdmin, firstName: e.target.value },
                      })
                    }
                    placeholder="Ahmet"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Soyad *</label>
                  <Input
                    value={createForm.companyAdmin.lastName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        companyAdmin: { ...createForm.companyAdmin, lastName: e.target.value },
                      })
                    }
                    placeholder="Yılmaz"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">E-posta *</label>
                  <Input
                    type="email"
                    value={createForm.companyAdmin.email}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        companyAdmin: { ...createForm.companyAdmin, email: e.target.value },
                      })
                    }
                    placeholder="admin@acme.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Geçici Şifre * (min 12 karakter)</label>
                  <Input
                    type="password"
                    value={createForm.companyAdmin.temporaryPassword}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        companyAdmin: { ...createForm.companyAdmin, temporaryPassword: e.target.value },
                      })
                    }
                    placeholder="En az 12 karakter"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                İptal
              </Button>
              <Button
                onClick={handleCreateCompany}
                disabled={submitting}
                className="bg-[#1e3a5f] hover:bg-[#2a4a6f]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Şirket Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
