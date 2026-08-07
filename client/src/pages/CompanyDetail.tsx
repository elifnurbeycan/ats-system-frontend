import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { platformCompanyApi } from "@/lib/api";
import type { CompanyResponse } from "@/lib/api";

interface CompanyDetailProps {
  companyId: number;
}

function getStatusBadge(status: string, active: boolean) {
  if (!active) return <Badge variant="secondary">Pasif</Badge>;
  switch (status) {
    case "ACTIVE": return <Badge className="bg-emerald-500">Aktif</Badge>;
    case "SUSPENDED": return <Badge className="bg-amber-500">Askıya Alındı</Badge>;
    case "INACTIVE": return <Badge variant="secondary">Pasif</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE": return "Aktif";
    case "SUSPENDED": return "Askıya Alındı";
    case "INACTIVE": return "Pasif";
    default: return status;
  }
}

export default function CompanyDetail({ companyId }: CompanyDetailProps) {
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformCompanyApi.getById(companyId);
      setCompany(data);
      setName(data.name);
    } catch (err: any) {
      toast.error("Şirket bilgileri yüklenemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error("Şirket adı boş bırakılamaz");
      return;
    }
    setSaving(true);
    try {
      const updated = await platformCompanyApi.update(companyId, { name });
      setCompany(updated);
      toast.success("Şirket adı güncellendi");
    } catch (err: any) {
      toast.error("Güncelleme başarısız: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!company) return;
    try {
      // Backend CompanyStatus enum alıyor: ACTIVE, SUSPENDED, INACTIVE
      const newStatus = company.active ? "SUSPENDED" : "ACTIVE";
      const updated = await platformCompanyApi.changeStatus(companyId, {
        status: newStatus,
      });
      setCompany(updated);
      toast.success(updated.active ? "Şirket aktifleştirildi" : "Şirket askıya alındı");
    } catch (err: any) {
      toast.error("Durum değiştirilemedi: " + (err.message || "Bilinmeyen hata"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Şirket bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#1e3a5f]">{company.name}</h1>
                <p className="text-xs text-muted-foreground font-mono">{company.code}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(company.status, company.active)}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Şirket Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Şirket Adı</label>
              <div className="flex gap-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-md"
                />
                <Button
                  onClick={handleUpdate}
                  disabled={saving || name === company.name}
                  className="bg-[#1e3a5f] hover:bg-[#2a4a6f]"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Kaydet
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Şirket Kodu</label>
              <Badge variant="outline" className="font-mono text-base px-3 py-1">
                {company.code}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Şirket Durumu</p>
                <p className="text-sm text-muted-foreground">
                  {company.active
                    ? `Şirket aktif durumda (${getStatusLabel(company.status)})`
                    : "Şirket askıya alınmış durumda"}
                </p>
              </div>
              <Button
                variant={company.active ? "outline" : "default"}
                onClick={handleToggleStatus}
              >
                {company.active ? "Askıya Al" : "Aktifleştir"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
