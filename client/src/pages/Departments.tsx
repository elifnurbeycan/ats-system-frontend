import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Building2,
  Briefcase,
  Users,
  ChevronRight,
  ArrowLeft,
  Search,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { departmentApi, positionApi, candidateApi, pipelineApi } from "@/lib/api";
import { toast } from "sonner";
import { CandidateIdentity } from "@/components/candidate/CandidateIdentity";
import { LinkedInLink } from "@/components/candidate/LinkedInLink";
import { hasPermission } from "@/lib/permissions";

type ViewMode = "departments" | "positions" | "candidates";

export default function Departments() {
  const canCreateDepartment = hasPermission("DEPARTMENT_CREATE");
  const canDeactivateDepartment = hasPermission("DEPARTMENT_DEACTIVATE");
  const [viewMode, setViewMode] = useState<ViewMode>("departments");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedPosId, setSelectedPosId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Department dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  // Delete confirmation dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load core data first — must not fail
      const [deptsData, positionsData, pipelinesData] = await Promise.all([
        departmentApi.getAll(),
        positionApi.getAll(),
        pipelineApi.getAll(),
      ]);

      setDepartments(deptsData);
      setPositions(positionsData);
      setPipelines(pipelinesData);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Bilinmeyen hata";
      toast.error("Veriler yüklenemedi: " + msg);
    } finally {
      setLoading(false);
    }

    // Load candidates separately — failure won't block department list
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
      // Silent — candidate count just shows 0
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allStages = useMemo(() => {
    return pipelines.flatMap((p) => p.stages || []);
  }, [pipelines]);

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === selectedDeptId),
    [departments, selectedDeptId]
  );

  const positionsInDept = useMemo(() => {
    if (!selectedDeptId) return [];
    return positions
      .filter((p) => p.departmentId === selectedDeptId)
      .map((p) => {
        const appliedCandidates = candidates.filter((c) =>
          c.processes?.some((pr: any) => pr.positionId === p.id)
        );
        const hiredCount = candidates.filter((c) =>
          c.processes?.some(
            (pr: any) =>
              pr.positionId === p.id && pr.currentStageName.toLowerCase().includes("alındı")
          )
        ).length;
        return { ...p, candidateCount: appliedCandidates.length, hiredCount };
      });
  }, [positions, selectedDeptId, candidates]);

  const selectedPos = useMemo(
    () => positions.find((p) => p.id === selectedPosId),
    [positions, selectedPosId]
  );

  const candidatesInPos = useMemo(() => {
    if (!selectedPosId) return [];
    return candidates
      .filter((d) => d.processes?.some((p: any) => p.positionId === selectedPosId))
      .map((d) => {
        const c = d.candidate;
        const process = d.processes.find((p: any) => p.positionId === selectedPosId);
        let stage: any = undefined;
        if (process) {
          const matchedStage = allStages.find((s) => s.id === process.currentStageId);
          stage = matchedStage
            ? { name: matchedStage.name, stageType: matchedStage.stageType }
            : { name: process.currentStageName, stageType: "ACTIVE" };
        }
        return { candidate: c, process, stage };
      });
  }, [selectedPosId, candidates, allStages]);

  const filteredCandidates = useMemo(() => {
    if (!search) return candidatesInPos;
    return candidatesInPos.filter(
      (item) =>
        item.candidate.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (item.candidate.currentJobTitle || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [candidatesInPos, search]);

  const handleSelectDept = (deptId: number) => {
    setSelectedDeptId(deptId);
    setViewMode("positions");
    setSearch("");
  };

  const handleSelectPos = (posId: number) => {
    setSelectedPosId(posId);
    setViewMode("candidates");
    setSearch("");
  };

  const goBack = () => {
    if (viewMode === "candidates") {
      setViewMode("positions");
      setSelectedPosId(null);
    } else if (viewMode === "positions") {
      setViewMode("departments");
      setSelectedDeptId(null);
    }
  };

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: "Departmanlar", mode: "departments" as ViewMode }];
    if (selectedDept && viewMode !== "departments") {
      crumbs.push({ label: selectedDept.name, mode: "positions" as ViewMode });
    }
    if (selectedPos && viewMode === "candidates") {
      crumbs.push({ label: selectedPos.title, mode: "candidates" as ViewMode });
    }
    return crumbs;
  }, [selectedDept, selectedPos, viewMode]);

  const departmentsWithStats = useMemo(() => {
    return departments.map((d) => {
      const deptPositions = positions.filter((p) => p.departmentId === d.id);
      const openPositions = deptPositions.filter((p) => p.status === "OPEN");
      const deptCandidates = candidates.filter((c) =>
        c.processes?.some((pr: any) => deptPositions.some((p) => p.id === pr.positionId))
      );
      return {
        ...d,
        positionCount: deptPositions.length,
        openPositionCount: openPositions.length,
        candidateCount: deptCandidates.length,
      };
    });
  }, [departments, positions, candidates]);

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

  const stageColor = (stageType: string) =>
    stageType === "HIRED"
      ? "bg-primary/10 text-primary border-primary/20"
      : stageType === "REJECTED"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : stageType === "ON_HOLD"
      ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
      : "bg-chart-2/10 text-chart-2 border-chart-2/20";

  // --- Create Department ---
  const handleOpenCreate = () => {
    setNewDeptName("");
    setNewDeptCode("");
    setNewDeptDesc("");
    setShowCreateDialog(true);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      toast.error("Departman adı zorunludur.");
      return;
    }

    // Auto-generate code from name
    const turkishMap: Record<string, string> = {
      ç: "c", Ç: "C",
      ğ: "g", Ğ: "G",
      ı: "i", I: "I",
      İ: "I",
      ö: "o", Ö: "O",
      ş: "s", Ş: "S",
      ü: "u", Ü: "U"
    };
    const asciiName = newDeptName
      .split("")
      .map((char) => turkishMap[char] || char)
      .join("");
    const baseCode = asciiName
      .toUpperCase()
      .replace(/[^A-Z0-9\s_-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 40);
    const generatedCode = `${baseCode}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    setCreateLoading(true);
    try {
      await departmentApi.create({
        name: newDeptName.trim(),
        code: generatedCode,
        description: newDeptDesc.trim() || undefined,
      });
      toast.success(`"${newDeptName.trim()}" departmanı oluşturuldu.`);
      setShowCreateDialog(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Departman oluşturulamadı.";
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };


  // --- Delete (Deactivate) Department ---
  const handleDeleteDept = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await departmentApi.deactivate(deleteTargetId);
      toast.success("Departman pasifleştirildi.");
      setDeleteTargetId(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Departman silinemedi.";
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && departments.length === 0) {
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
            {viewMode === "departments" && "Departmanlar"}
            {viewMode === "positions" && selectedDept?.name}
            {viewMode === "candidates" && selectedPos?.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {viewMode === "departments" && `${departmentsWithStats.length} departman`}
            {viewMode === "positions" && `${positionsInDept.length} pozisyon`}
            {viewMode === "candidates" && `${filteredCandidates.length} aday`}
          </p>
        </div>

        {/* Create button — only on departments view */}
        {viewMode === "departments" && canCreateDepartment && (
          <button
            id="create-department-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all duration-200 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Yeni Departman
          </button>
        )}
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <nav className="flex items-center gap-2 text-sm animate-slide-up">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.mode} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              {i < breadcrumbs.length - 1 ? (
                <button
                  onClick={() => {
                    if (crumb.mode === "departments") {
                      setViewMode("departments");
                      setSelectedDeptId(null);
                      setSelectedPosId(null);
                    } else {
                      setViewMode("positions");
                      setSelectedPosId(null);
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Back button */}
      {viewMode !== "departments" && (
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-slide-up"
        >
          <ArrowLeft className="h-4 w-4" />
          {viewMode === "positions" ? "Departmanlara dön" : "Pozisyonlara dön"}
        </button>
      )}

      {/* ===== DEPARTMENTS VIEW ===== */}
      {viewMode === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departmentsWithStats.length === 0 ? (
            <div className="col-span-full glass rounded-2xl p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Henüz departman tanımlanmamış.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Yukarıdaki "Yeni Departman" butonuna tıklayarak ilk departmanı oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            departmentsWithStats.map((dept, i) => (
              <div
                key={dept.id}
                className="glass glass-hover rounded-2xl p-6 text-left animate-slide-up group relative"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Delete button */}
                {canDeactivateDepartment && <button
                  id={`delete-dept-${dept.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetId(dept.id);
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="Departmanı sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>}

                <button
                  className="block w-full text-left"
                  onClick={() => handleSelectDept(dept.id)}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{dept.code}</p>
                  {dept.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {dept.description}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Briefcase className="h-3 w-3" />
                        Pozisyon
                      </div>
                      <p className="font-mono text-lg font-semibold text-foreground">
                        {dept.positionCount}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Briefcase className="h-3 w-3" />
                        Açık
                      </div>
                      <p className="font-mono text-lg font-semibold text-primary">
                        {dept.openPositionCount}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Users className="h-3 w-3" />
                        Aday
                      </div>
                      <p className="font-mono text-lg font-semibold text-foreground">
                        {dept.candidateCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-4">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== POSITIONS VIEW ===== */}
      {viewMode === "positions" && (
        <>
          <div className="relative max-w-md animate-slide-up">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pozisyon ara..."
              className="w-full rounded-xl bg-input/50 border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
            />
          </div>

          <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Pozisyon</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Adaylar</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Boş Kontenjan</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Durum</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {positionsInDept
                    .filter(
                      (p) =>
                        !search ||
                        p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.code.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((pos) => (
                      <tr
                        key={pos.id}
                        className="border-b border-border last:border-0 hover:bg-accent/30 transition-all duration-150 group"
                      >
                        <td className="px-6 py-4">
                          <button onClick={() => handleSelectPos(pos.id)} className="block text-left">
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {pos.title}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{pos.code}</p>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm text-foreground">{pos.candidateCount}</span>
                            {pos.hiredCount > 0 && (
                              <span className="text-xs text-primary font-semibold">({pos.hiredCount} işe alındı)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-foreground">{pos.vacancyCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium", statusColors[pos.status] || "bg-muted text-muted-foreground border-border")}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusLabels[pos.status] || pos.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleSelectPos(pos.id)}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {positionsInDept.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">Bu departmana ait pozisyon bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== CANDIDATES VIEW ===== */}
      {viewMode === "candidates" && (
        <>
          <div className="relative max-w-md animate-slide-up">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Aday ara..."
              className="w-full rounded-xl bg-input/50 border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
            />
          </div>

          <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Aday</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Mevcut Şirket</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">E-posta</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Telefon</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">LinkedIn</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Aşama</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((item) => {
                    const c = item.candidate;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-0 hover:bg-accent/30 transition-all duration-150 group"
                      >
                        <td className="px-6 py-3.5">
                          <CandidateIdentity
                            candidateId={c.id}
                            fullName={c.fullName}
                            firstName={c.firstName}
                            lastName={c.lastName}
                            subtitle={c.currentJobTitle || "İş Unvanı Yok"}
                          />
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-sm text-muted-foreground">{c.currentCompany || "—"}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-sm text-muted-foreground truncate max-w-[160px] block">{c.email || "—"}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-sm text-muted-foreground">{c.phone || "—"}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <LinkedInLink url={c.linkedinUrl} />
                        </td>
                        <td className="px-6 py-3.5">
                          {item.stage && (
                            <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap", stageColor(item.stage.stageType))}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {item.stage.name.length > 22 ? item.stage.name.split(" /")[0] : item.stage.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <Link href={`/adaylar/${c.id}`}>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCandidates.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">Bu pozisyonda aday bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== CREATE DEPARTMENT DIALOG ===== */}
      {showCreateDialog && canCreateDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground">Yeni Departman</h2>
              </div>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Departman Adı <span className="text-destructive">*</span>
                </label>
                <input
                  id="dept-name-input"
                  type="text"
                  value={newDeptName}
                  onChange={(e) => {
                    setNewDeptName(e.target.value);
                  }}
                  placeholder="örn. Yazılım Geliştirme"
                  required
                  className="w-full rounded-xl bg-input/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Açıklama <span className="text-muted-foreground font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  id="dept-desc-input"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="Departman hakkında kısa açıklama..."
                  rows={3}
                  className="w-full rounded-xl bg-input/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all"
                >
                  İptal
                </button>
                <button
                  id="submit-dept-btn"
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION DIALOG ===== */}
      {deleteTargetId !== null && canDeactivateDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-slide-up">
            <div className="px-6 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">Departmanı Sil</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Bu departmanı pasifleştirmek istediğinize emin misiniz? Bu işlem mevcut pozisyonları ve adayları etkilemez.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all"
              >
                İptal
              </button>
              <button
                id="confirm-delete-dept-btn"
                onClick={handleDeleteDept}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-white hover:bg-destructive/90 transition-all disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
