import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Users,
  Calendar,
  ChevronRight,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { positionApi, departmentApi, candidateApi } from "@/lib/api";
import { toast } from "sonner";
import { hasPermission } from "@/lib/permissions";
import { exportExcel } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Positions() {
  const canCreatePosition = hasPermission("POSITION_CREATE");
  const canUpdatePosition = hasPermission("POSITION_UPDATE");
  const canChangePositionStatus = hasPermission("POSITION_STATUS_CHANGE");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    code: "",
    departmentId: "",
    vacancyCount: "1",
    description: "",
  });

  // Edit Position Dialog State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null as number | null,
    title: "",
    code: "",
    departmentId: "",
    vacancyCount: "1",
    description: "",
  });

  // Status Change State
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [targetPositionId, setTargetPositionId] = useState<number | null>(null);
  const [targetPositionName, setTargetPositionName] = useState("");
  const [targetStatus, setTargetStatus] = useState("");

  const handleOpenEdit = (p: any) => {
    setEditForm({
      id: p.id,
      title: p.title || "",
      code: p.code || "",
      departmentId: String(p.departmentId || ""),
      vacancyCount: String(p.vacancyCount || "1"),
      description: p.description || "",
    });
    setShowEditDialog(true);
  };

  const handleOpenStatusChange = (p: any) => {
    setTargetPositionId(p.id);
    setTargetPositionName(p.title);
    setTargetStatus(p.status === "OPEN" ? "CLOSED" : "OPEN");
    setShowStatusDialog(true);
  };

  const handleEditPosition = async () => {
    if (!editForm.id || !editForm.title.trim() || !editForm.departmentId) {
      toast.error("Lütfen başlık ve departman alanlarını doldurun.");
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        departmentId: parseInt(editForm.departmentId),
        vacancyCount: parseInt(editForm.vacancyCount) || 1,
        description: editForm.description.trim() || undefined,
      };

      await positionApi.update(editForm.id, payload);
      toast.success("Pozisyon başarıyla güncellendi.");
      setShowEditDialog(false);
      loadData();
    } catch (err: any) {
      toast.error("Pozisyon güncellenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleTogglePositionStatus = async () => {
    if (!targetPositionId || !targetStatus) return;

    setStatusSubmitting(true);
    try {
      await positionApi.changeStatus(targetPositionId, targetStatus);
      toast.success(`Pozisyon durumu başarıyla ${targetStatus === "OPEN" ? "açık" : "kapalı"} olarak güncellendi.`);
      setShowStatusDialog(false);
      loadData();
    } catch (err: any) {
      toast.error("Pozisyon durumu güncellenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setStatusSubmitting(false);
      setTargetPositionId(null);
    }
  };


  const loadData = async () => {
    setLoading(true);
    try {
      // Load positions and departments first — dropdown must work
      const [positionsData, deptsData] = await Promise.all([
        positionApi.getAll(),
        departmentApi.getAll(),
      ]);
      setPositions(positionsData);
      setDepartments(deptsData);
    } catch (err: any) {
      toast.error("Veriler yüklenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }

    // Load candidates separately — failure won't break position list
    try {
      const candidatesData = await candidateApi.getAll();
      const detailedCandidates = await Promise.all(
        candidatesData.map(async (c) => {
          try {
            return await candidateApi.getById(c.id);
          } catch {
            return { candidate: c, processes: [] };
          }
        })
      );
      setCandidates(detailedCandidates);
    } catch {
      // Silent — candidate counts will just show 0
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const positionsWithStats = useMemo(() => {
    return positions.map((p) => {
      // Find candidate applications for this position
      const appliedCandidates = candidates.filter((c) =>
        c.processes?.some((pr: any) => pr.positionId === p.id)
      );

      const hiredCount = candidates.filter((c) =>
        c.processes?.some(
          (pr: any) =>
            pr.positionId === p.id &&
            pr.currentStageName.toLowerCase().includes("alındı")
        )
      ).length;

      return {
        ...p,
        candidateCount: appliedCandidates.length,
        hiredCount,
      };
    });
  }, [positions, candidates]);

  const filtered = useMemo(() => {
    return positionsWithStats.filter((p) => {
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesDepartment = departmentFilter === "ALL" || String(p.departmentId) === departmentFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [positionsWithStats, search, statusFilter, departmentFilter]);

  const exportPositions = async () => {
    if (filtered.length === 0) {
      toast.error("Excel'e aktarılacak pozisyon bulunamadı.");
      return;
    }
    await exportExcel(filtered.map((position) => ({
      "Pozisyon": position.title,
      "Kod": position.code,
      "Departman": position.departmentName,
      "Durum": statusLabels[position.status] || position.status,
      "Kontenjan": position.vacancyCount,
      "Başvuran Aday": position.candidateCount,
      "İşe Alınan": position.hiredCount,
      "Açılış Tarihi": position.openedAt ? new Date(position.openedAt).toLocaleString("tr-TR") : "",
      "Kapanış Tarihi": position.closedAt ? new Date(position.closedAt).toLocaleString("tr-TR") : "",
      "Açıklama": position.description,
    })), "pozisyon-raporu", "Pozisyonlar");
    toast.success(`${filtered.length} pozisyon Excel'e aktarıldı.`);
  };

  const handleCreatePosition = async () => {
    const { title, departmentId, vacancyCount, description } = createForm;
    if (!title || !departmentId || !vacancyCount) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }

    // Auto-generate code from title
    const turkishMap: Record<string, string> = {
      ç: "c", Ç: "C",
      ğ: "g", Ğ: "G",
      ı: "i", I: "I",
      İ: "I",
      ö: "o", Ö: "O",
      ş: "s", Ş: "S",
      ü: "u", Ü: "U"
    };
    const asciiTitle = title
      .split("")
      .map((char) => turkishMap[char] || char)
      .join("");
    const baseCode = asciiTitle
      .toUpperCase()
      .replace(/[^A-Z0-9\s_-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 40);
    const generatedCode = `${baseCode}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    setSubmitting(true);
    try {
      const newPos = await positionApi.create({
        title,
        code: generatedCode,
        departmentId: parseInt(departmentId),
        vacancyCount: parseInt(vacancyCount),
        description: description || undefined,
      });

      // Automatically publish/open the position
      await positionApi.changeStatus(newPos.id, "OPEN");

      toast.success("Pozisyon başarıyla oluşturuldu ve yayınlandı.");
      setShowCreateDialog(false);

      setCreateForm({
        title: "",
        code: "",
        departmentId: "",
        vacancyCount: "1",
        description: "",
      });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Bilinmeyen hata";
      toast.error("Pozisyon oluşturulamadı: " + msg);
    } finally {
      setSubmitting(false);
    }
  };


  const statusFilters: { value: string; label: string }[] = [
    { value: "ALL", label: "Tümü" },
    { value: "OPEN", label: "Açık" },
    { value: "ON_HOLD", label: "Beklemede" },
    { value: "CLOSED", label: "Kapalı" },
    { value: "CANCELLED", label: "İptal" },
  ];

  const statusColors: Record<string, string> = {
    OPEN: "bg-primary/10 text-primary border-primary/20",
    ON_HOLD: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    CLOSED: "bg-muted text-muted-foreground border-border",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const statusLabels: Record<string, string> = {
    OPEN: "Açık",
    ON_HOLD: "Beklemede",
    CLOSED: "Kapalı",
    CANCELLED: "İptal",
  };

  if (loading && positions.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-slide-up">
        <div>
          <h1 className="page-title">
            Pozisyonlar
          </h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} pozisyon listeleniyor
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={exportPositions} className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
            <Download className="h-4 w-4" /> Excel'e Aktar
          </button>
          {canCreatePosition && <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all duration-200 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Yeni Pozisyon
          </button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pozisyon adı veya kod ara..."
            className="w-full rounded-xl bg-input/50 border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          className="min-w-48 rounded-xl border border-border bg-input/30 px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        >
          <option value="ALL">Tüm Departmanlar</option>
          {departments.map((department) => (
            <option key={department.id} value={String(department.id)}>{department.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 overflow-x-auto">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200",
                statusFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-input/30 text-muted-foreground border border-border hover:text-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Positions table */}
      <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "200ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Pozisyon
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Departman
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Adaylar
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Boş Kontenjan
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Durum
                </th>
                <th className="px-6 py-4 w-28 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pos, i) => (
                <tr
                  key={pos.id}
                  className="border-b border-border last:border-0 hover:bg-accent/30 transition-all duration-200 group"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/pozisyonlar/${pos.id}`}
                      className="block"
                    >
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {pos.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {pos.code}
                      </p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {pos.departmentName || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-sm text-foreground">
                        {pos.candidateCount}
                      </span>
                      {pos.hiredCount > 0 && (
                        <span className="text-xs text-primary font-semibold">
                          ({pos.hiredCount} işe alındı)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-foreground">
                      {pos.vacancyCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                        statusColors[pos.status] || "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabels[pos.status] || pos.status}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/pozisyonlar/${pos.id}`} title="Pozisyon Detayları">
                          <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
                        </Link>
                        {canUpdatePosition && <button
                          onClick={() => handleOpenEdit(pos)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded hover:bg-accent"
                          title="Pozisyonu Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>}
                        {canChangePositionStatus && <button
                          onClick={() => handleOpenStatusChange(pos)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded hover:bg-accent"
                          title={pos.status === "OPEN" ? "Pozisyonu Kapat (Arşivle)" : "Pozisyonu Aç (Aktifleştir)"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>}
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Pozisyon bulunamadı.</p>
          </div>
        )}
      </div>

      {/* New Position Dialog */}
      <Dialog open={showCreateDialog && canCreatePosition} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Yeni Pozisyon Oluştur</DialogTitle>
            <DialogDescription>
              Taslak aşamasında yeni bir işe alım pozisyonu tanımlayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pozisyon Unvanı *</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Kıdemli Java Geliştirici"
              />
            </div>

             <div className="space-y-1.5">
               <label className="text-sm font-medium">Açık Kontenjan *</label>
               <Input
                 type="number"
                 min="1"
                 value={createForm.vacancyCount}
                 onChange={(e) => setCreateForm({ ...createForm, vacancyCount: e.target.value })}
               />
             </div>


            <div className="space-y-1.5">
              <label className="text-sm font-medium">Departman *</label>
              <Select
                value={createForm.departmentId}
                onValueChange={(val) => setCreateForm({ ...createForm, departmentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectItem value="none" disabled>Departman bulunmuyor</SelectItem>
                  ) : (
                    departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pozisyon Açıklaması</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Pozisyon gereksinimleri ve detayları..."
                className="w-full rounded-xl bg-input/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreatePosition}
              disabled={submitting}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Position Dialog */}
      <Dialog open={showEditDialog && canUpdatePosition} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Pozisyonu Düzenle</DialogTitle>
            <DialogDescription>
              Pozisyon tanımlarını ve detaylarını güncelleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pozisyon Unvanı *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="örn. Kıdemli Yazılım Mühendisi"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pozisyon Kodu</label>
              <Input
                value={editForm.code}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
                placeholder="örn. SR-SWE"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Pozisyon kodları benzersizdir ve değiştirilemez.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Departman *</label>
              <Select
                value={editForm.departmentId}
                onValueChange={(val) => setEditForm({ ...editForm, departmentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Açık Kontenjan Sayısı *</label>
              <Input
                type="number"
                min="1"
                value={editForm.vacancyCount}
                onChange={(e) => setEditForm({ ...editForm, vacancyCount: e.target.value })}
                placeholder="1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pozisyon Açıklaması</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Pozisyon gereksinimleri ve detayları..."
                className="w-full rounded-xl bg-input/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleEditPosition}
              disabled={editSubmitting}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {editSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor
                </>
              ) : (
                "Değişiklikleri Kaydet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Position Status Confirm Dialog */}
      <Dialog open={showStatusDialog && canChangePositionStatus} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Pozisyon Durumunu Değiştir</DialogTitle>
            <DialogDescription>
              <strong>{targetPositionName}</strong> unvanlı pozisyonun durumunu <strong>{targetStatus === "OPEN" ? "Açık (Aktif)" : "Kapalı (Arşiv)"}</strong> olarak güncellemek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleTogglePositionStatus}
              disabled={statusSubmitting}
              className={cn("text-white", targetStatus === "OPEN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90")}
            >
              {statusSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Güncelleniyor
                </>
              ) : (
                "Evet, Güncelle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
