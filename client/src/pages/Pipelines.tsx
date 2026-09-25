import { useState, useEffect, useMemo } from "react";
import {
  GitBranch,
  Plus,
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Star,
  RefreshCw,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineApi, candidateApi, candidateProcessApi, type PipelineSummary, type Pipeline } from "@/lib/api";
import { toast } from "sonner";
import { CandidateIdentity } from "@/components/candidate/CandidateIdentity";
import { LinkedInLink } from "@/components/candidate/LinkedInLink";
import { StageChangeDialog } from "@/components/candidate/StageChangeDialog";
import { EditPipelineDialog, type PipelineEditPayload } from "@/components/pipeline/EditPipelineDialog";
import { hasPermission } from "@/lib/permissions";
import { exportExcel } from "@/lib/excel";
import { generateEntityCode } from "@/lib/entity-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StageDraft = {
  name: string;
  code: string;
  description: string;
  stageType: "ACTIVE" | "HIRED" | "REJECTED" | "ON_HOLD";
};

const emptyStage = (): StageDraft => ({ name: "", code: "", description: "", stageType: "ACTIVE" });

export default function Pipelines() {
  const canManagePipeline = hasPermission("PIPELINE_MANAGE");
  const canChangeCandidateStage = hasPermission("CANDIDATE_STAGE_CHANGE");
  // List of pipeline summaries (no stages)
  const [pipelineSummaries, setPipelineSummaries] = useState<PipelineSummary[]>([]);
  // Full detail of the selected pipeline (includes stages)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showPipelineOverview, setShowPipelineOverview] = useState(false);
  const [showEditPipeline, setShowEditPipeline] = useState(false);
  const [editPipelineSaving, setEditPipelineSaving] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Table filter states
  const [searchFilter, setSearchFilter] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingProcessId, setUpdatingProcessId] = useState<number | null>(null);
  const [pendingStageChange, setPendingStageChange] = useState<{
    processId: number;
    candidateName: string;
    fromStage: string;
    targetStageId: number;
    toStage: string;
  } | null>(null);

  // Create Pipeline dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineCode, setNewPipelineCode] = useState("");
  const [newPipelineDesc, setNewPipelineDesc] = useState("");
  const [newPipelineDefault, setNewPipelineDefault] = useState(false);
  const [newPipelineStages, setNewPipelineStages] = useState<StageDraft[]>([]);

  // Deactivate confirmation
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const handleStageChange = async (note?: string) => {
    if (!pendingStageChange) return;
    setUpdatingProcessId(pendingStageChange.processId);
    try {
      await candidateProcessApi.changeStage(pendingStageChange.processId, {
        stageId: pendingStageChange.targetStageId,
        reason: note,
      });
      toast.success("Adayın aşaması başarıyla güncellendi.");
      setPendingStageChange(null);
      // Reload both board summaries and detailed candidate data
      loadSummaries();
    } catch (err: any) {
      toast.error("Aday aşaması güncellenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setUpdatingProcessId(null);
    }
  };

  const handleUpdatePipeline = async (payload: PipelineEditPayload) => {
    if (!selectedPipeline) return;
    setEditPipelineSaving(true);
    try {
      const retainedStageIds = new Set(payload.stages.flatMap((stage) => stage.id === null ? [] : [stage.id]));
      const removedStages = selectedPipeline.stages.filter((stage) => !retainedStageIds.has(stage.id));
      await Promise.all(removedStages.map((stage) => pipelineApi.deleteStage(selectedPipeline.id, stage.id)));
      await pipelineApi.update(selectedPipeline.id, {
        name: payload.name.trim(), description: payload.description.trim(), defaultPipeline: payload.defaultPipeline,
      });
      await Promise.all(payload.stages.map((stage, index) => stage.id === null
        ? pipelineApi.addStage(selectedPipeline.id, {
            name: stage.name.trim(), code: generateEntityCode(stage.name),
            description: stage.description.trim(), displayOrder: index + 1, stageType: stage.stageType,
          })
        : pipelineApi.updateStage(selectedPipeline.id, stage.id, {
            name: stage.name.trim(), description: stage.description.trim(), stageType: stage.stageType,
          })));
      await loadSummaries();
      await loadPipelineDetail(selectedPipeline.id);
      setShowEditPipeline(false);
      toast.success("İşe alım süreci güncellendi.");
    } catch (err: any) {
      toast.error("İşe alım süreci güncellenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setEditPipelineSaving(false);
    }
  };

  const loadSummaries = async () => {
    setLoading(true);
    try {
      // Load pipelines first — must not fail
      const summaries = await pipelineApi.getAll();
      setPipelineSummaries(summaries);

      // Auto-select default or first pipeline
      const def = summaries.find((p) => p.defaultPipeline) || summaries[0];
      if (def) {
        setSelectedPipelineId(def.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Bilinmeyen hata";
      toast.error("İşe alım süreçleri yüklenemedi: " + msg);
    } finally {
      setLoading(false);
    }

    // Load candidates separately — failure here should not block pipelines
    try {
      const candidatesData = await candidateApi.getAll();
      const detailedCandidates = await Promise.all(
        candidatesData.map(async (c) => {
          try { return await candidateApi.getById(c.id); }
          catch { return { candidate: c, processes: [] }; }
        })
      );
      setCandidates(detailedCandidates);
    } catch {
      // Candidates failing silently — pipeline flow still works
    }
  };

  // Load pipeline detail (with stages) whenever selection changes
  const loadPipelineDetail = async (id: number) => {
    setDetailLoading(true);
    setSelectedPipeline(null);
    try {
      const detail = await pipelineApi.getById(id);
      setSelectedPipeline(detail);
    } catch (err: any) {
      toast.error("İşe alım süreci detayı yüklenemedi: " + (err.message || ""));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { loadSummaries(); }, []);

  useEffect(() => {
    if (selectedPipelineId != null) {
      loadPipelineDetail(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  const stages = useMemo(() => {
    if (!selectedPipeline?.stages) return [];
    return selectedPipeline.stages
      .filter((stage: any) => stage.active !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [selectedPipeline]);


  const stagesWithCandidates = useMemo(() => {
    return stages.map((stage: any) => {
      const stageCandidates = candidates
        .filter((d) => d.processes?.some((p: any) => p.currentStageId === stage.id))
        .map((d) => d.candidate);
      return { ...stage, candidateCount: stageCandidates.length, candidates: stageCandidates };
    });
  }, [stages, candidates]);

  const stats = useMemo(() => {
    const active = candidates.filter((c) =>
      c.processes?.some((p: any) => {
        const stage = stages.find((s) => s.id === p.currentStageId);
        return stage?.stageType === "ACTIVE";
      })
    ).length;
    const hired = candidates.filter((c) =>
      c.processes?.some((p: any) => {
        const stage = stages.find((s) => s.id === p.currentStageId);
        return stage?.stageType === "HIRED";
      })
    ).length;
    const rejected = candidates.filter((c) =>
      c.processes?.some((p: any) => {
        const stage = stages.find((s) => s.id === p.currentStageId);
        return stage?.stageType === "REJECTED";
      })
    ).length;
    const onHold = candidates.filter((c) =>
      c.processes?.some((p: any) => {
        const stage = stages.find((s) => s.id === p.currentStageId);
        return stage?.stageType === "ON_HOLD";
      })
    ).length;
    return { active, hired, rejected, onHold };
  }, [candidates, stages]);

  const pipelineProcesses = useMemo(() => {
    if (!selectedPipeline) return [];

    const rows: any[] = [];
    candidates.forEach((c: any) => {
      c.processes?.forEach((p: any) => {
        if (p.pipelineId === selectedPipeline.id) {
          rows.push({
            candidate: c.candidate,
            process: p,
            positionTitle: p.positionTitle || "Bilinmiyor",
            departmentId: p.departmentId,
            departmentName: p.departmentName || "Departman belirtilmemiş",
            updatedAt: p.updatedAt || p.createdAt || c.candidate.updatedAt || c.candidate.createdAt
          });
        }
      });
    });
    return rows;
  }, [selectedPipeline, candidates]);

  const uniquePositions = useMemo(() => {
    const list = new Set<string>();
    pipelineProcesses.forEach((p) => {
      if (p.positionTitle) list.add(p.positionTitle);
    });
    return Array.from(list);
  }, [pipelineProcesses]);

  const uniqueDepartments = useMemo(() => {
    const departments = new Map<string, string>();
    pipelineProcesses.forEach((row) => {
      if (row.departmentId != null) {
        departments.set(String(row.departmentId), row.departmentName);
      }
    });
    return Array.from(departments, ([id, name]) => ({ id, name }))
      .sort((first, second) => first.name.localeCompare(second.name, "tr"));
  }, [pipelineProcesses]);

  const filteredProcesses = useMemo(() => {
    return pipelineProcesses.filter((row: any) => {
      // 1. Search text filter
      const search = searchFilter.toLowerCase().trim();
      const matchSearch =
        !search ||
        row.candidate.fullName.toLowerCase().includes(search) ||
        row.candidate.email?.toLowerCase().includes(search) ||
        row.positionTitle.toLowerCase().includes(search) ||
        row.process.currentStageName.toLowerCase().includes(search);

      // 2. Position filter
      const matchPos = posFilter === "ALL" || row.positionTitle === posFilter;

      const matchDepartment = departmentFilter === "ALL"
        || String(row.departmentId) === departmentFilter;

      // 3. Stage filter
      const matchStage = stageFilter === "ALL" || String(row.process.currentStageId) === stageFilter;

      // 4. Status filter
      const matchStatus = statusFilter === "ALL" || row.process.currentStageType === statusFilter;

      return matchSearch && matchDepartment && matchPos && matchStage && matchStatus;
    });
  }, [pipelineProcesses, searchFilter, departmentFilter, posFilter, stageFilter, statusFilter]);

  const handleExcelExport = async () => {
    if (filteredProcesses.length === 0) {
      toast.error("Excel'e aktarılacak başvuru bulunamadı.");
      return;
    }

    const statusLabels: Record<string, string> = {
      ACTIVE: "Aktif",
      ON_HOLD: "Beklemede",
      HIRED: "İşe Alındı",
      REJECTED: "Süreç sonlandı",
    };

    try {
      await exportExcel(
        filteredProcesses.map((row: any) => ({
          "Aday": row.candidate.fullName || `${row.candidate.firstName || ""} ${row.candidate.lastName || ""}`.trim(),
          "E-posta": row.candidate.email || "",
          "Telefon": row.candidate.phone || "",
          "Başvurulan Pozisyon": row.positionTitle,
          "Departman": row.departmentName,
          "İşe alım süreci": selectedPipeline?.name || row.process.pipelineName || "",
          "Mevcut Aşama": row.process.currentStageName || "",
          "Süreç Durumu": statusLabels[row.process.currentStageType] || row.process.currentStageType || "",
          "LinkedIn": row.candidate.linkedinUrl || "",
          "Başvuru Tarihi": row.process.createdAt
            ? new Date(row.process.createdAt).toLocaleString("tr-TR")
            : "",
          "Güncelleme Tarihi": row.updatedAt
            ? new Date(row.updatedAt).toLocaleString("tr-TR")
            : "",
        })),
        "ise-alim-sureci-raporu",
        "İşe alım süreci",
      );
      toast.success(`${filteredProcesses.length} başvuru Excel'e aktarıldı.`);
    } catch {
      toast.error("Excel raporu oluşturulamadı.");
    }
  };

  // --- Create Pipeline ---
  const handleOpenCreate = () => {
    setNewPipelineName("");
    setNewPipelineCode("");
    setNewPipelineDesc("");
    setNewPipelineDefault(pipelineSummaries.length === 0);
    setNewPipelineStages([emptyStage()]);
    setShowCreateDialog(true);
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) {
      toast.error("İşe alım süreci adı zorunludur.");
      return;
    }
    if (newPipelineStages.length === 0 || newPipelineStages.some((stage) => !stage.name.trim())) {
      toast.error("En az bir aşama ekleyin ve aşama adını doldurun.");
      return;
    }
    setCreateLoading(true);
    try {
      const payload = {
        name: newPipelineName.trim(),
        code: newPipelineCode || generateEntityCode(newPipelineName),
        description: newPipelineDesc.trim() || undefined,
        defaultPipeline: newPipelineDefault,
        stages: newPipelineStages.map((stage, index) => ({
          name: stage.name.trim(),
          code: stage.code || generateEntityCode(stage.name),
          description: stage.description.trim() || undefined,
          displayOrder: index + 1,
          stageType: stage.stageType,
        })),
      };
      await pipelineApi.create(payload);
      toast.success(`"${newPipelineName.trim()}" işe alım süreci oluşturuldu!`);
      setShowCreateDialog(false);
      loadSummaries();
    } catch (err: any) {
      const msg = err.response?.data?.message || "İşe alım süreci oluşturulamadı.";
      toast.error(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // --- Deactivate Pipeline ---
  const handleDeactivate = async () => {
    if (!deactivateTargetId) return;
    setDeactivateLoading(true);
    try {
      await pipelineApi.deactivate(deactivateTargetId);
      toast.success("İşe alım süreci silindi.");
      setDeactivateTargetId(null);
      if (selectedPipelineId === deactivateTargetId) {
        setSelectedPipeline(null);
        setSelectedPipelineId(null);
      }
      loadSummaries();
    } catch (err: any) {
      const msg = err.response?.data?.message || "İşe alım süreci silinemedi.";
      toast.error(msg);
    } finally {
      setDeactivateLoading(false);
    }
  };

  if (loading && pipelineSummaries.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stageConfig: Record<string, { border: string; bg: string; badge: string; icon: any; label: string }> = {
    ACTIVE: {
      border: "border-blue-200 dark:border-blue-800/70",
      bg: "bg-blue-50/50 dark:bg-blue-950/30",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
      icon: Clock,
      label: "Aktif",
    },
    ON_HOLD: {
      border: "border-amber-200 dark:border-amber-800/70",
      bg: "bg-amber-50/50 dark:bg-amber-950/30",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
      icon: PauseCircle,
      label: "Beklemede",
    },
    HIRED: {
      border: "border-emerald-200 dark:border-emerald-800/70",
      bg: "bg-emerald-50/50 dark:bg-emerald-950/30",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
      icon: CheckCircle2,
      label: "İşe Alındı",
    },
    REJECTED: {
      border: "border-red-200 dark:border-red-800/70",
      bg: "bg-red-50/50 dark:bg-red-950/30",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
      icon: XCircle,
      label: "Süreç sonlandı",
    },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-slide-up">
        <div>
          <h1 className="page-title">İşe alım süreci</h1>
          <p className="page-description">Adayların işe alım aşamalarını tek ekrandan yönetin.</p>
        </div>
        {canManagePipeline && <button
          id="create-pipeline-btn"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni işe alım süreci
        </button>}
      </div>

      {/* Pipeline selector */}
      {pipelineSummaries.length > 0 && (
        <div className="enterprise-panel flex gap-1 overflow-x-auto p-1.5 animate-slide-up" style={{ animationDelay: "100ms" }}>
          {pipelineSummaries.map((pipeline) => (
            <div
              key={pipeline.id}
              className={cn(
                "group flex items-center rounded-md transition-colors",
                selectedPipelineId === pipeline.id ? "bg-primary/10" : "hover:bg-muted"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedPipelineId(pipeline.id);
                  if (canManagePipeline) setShowEditPipeline(true);
                  else setShowPipelineOverview(true);
                }}
                className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"
                aria-label={`${pipeline.name} detaylarını göster`}
              >
                <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  selectedPipelineId === pipeline.id
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
                >
                <GitBranch className="h-4 w-4" />
                </span>
              <span className="text-left">
                <p
                  className={cn(
                    "text-sm font-medium",
                    selectedPipelineId === pipeline.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {pipeline.name}
                </p>
                {pipeline.defaultPipeline && (
                  <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                    <Star className="h-2.5 w-2.5" /> Varsayılan
                  </p>
                )}
              </span>
              </button>
              {canManagePipeline && <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeactivateTargetId(pipeline.id);
                }}
                className="mr-1 rounded-md p-1.5 text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                title="İşe alım sürecini sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {pipelineSummaries.length === 0 && !loading && (
        <div className="glass rounded-2xl p-16 text-center animate-slide-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-5">
            <GitBranch className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground">Henüz işe alım süreci yok</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
            "Yeni işe alım süreci" butonuna tıklayarak 9 aşamalı standart işe alım sürecinizi oluşturabilirsiniz.
          </p>
          {canManagePipeline && <button
            onClick={handleOpenCreate}
            className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all mx-auto"
          >
            <Plus className="h-4 w-4" />
            İşe alım süreci oluştur
          </button>}
        </div>
      )}

      {/* Detail loading spinner */}
      {detailLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Selected pipeline info + stats */}
      {selectedPipeline && !detailLoading && (
        <>
          {/* Pipeline flow */}
          <div className="enterprise-panel p-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <h3 className="section-title mb-3">
              Aşama Akışı
            </h3>

            {stagesWithCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Bu işe alım süreci için tanımlı aşama bulunmuyor.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {stagesWithCandidates.map((stage: any) => {
                  const config = stageConfig[stage.stageType] || stageConfig.ACTIVE;
                  const Icon = config.icon;

                  const isSelected = stageFilter === String(stage.id);

                  return (
                    <button
                      type="button"
                      key={stage.id}
                      onClick={() => {
                        setStageFilter(isSelected ? "ALL" : String(stage.id));
                        window.requestAnimationFrame(() => {
                          document.getElementById("candidate-tracking")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        });
                      }}
                      aria-pressed={isSelected}
                      aria-label={`${stage.name} aşamasındaki ${stage.candidateCount} adayı göster`}
                      className={cn(
                        "min-h-24 min-w-40 flex-1 rounded-md border p-3 flex flex-col justify-between text-left transition-colors cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        config.border,
                        config.bg,
                        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                    >
                      {/* Stage header */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background/70 font-mono text-[10px] font-bold text-muted-foreground">
                            {stage.displayOrder}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                              config.badge
                            )}
                          >
                            <Icon className="h-2 w-2" />
                            {config.label}
                          </span>
                        </div>

                        {/* Stage name */}
                        <h4 className="font-semibold text-foreground text-xs leading-tight line-clamp-2">
                          {stage.name}
                        </h4>
                      </div>

                      {/* Candidate count badge */}
                      <div className="flex items-center gap-1 mt-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {stage.candidateCount}
                        </span>
                        <span className="text-[10px] text-muted-foreground">aday</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidate Tracking Table (Excel View) */}
          <div id="candidate-tracking" className="enterprise-panel scroll-mt-24 overflow-hidden animate-slide-up" style={{ animationDelay: "250ms" }}>
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="section-title">
                  Aday Aşamaları ve Takibi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Adayları filtreleyin ve aşamalarını güncelleyin.</p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {(searchFilter || departmentFilter !== "ALL" || posFilter !== "ALL" || stageFilter !== "ALL" || statusFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchFilter("");
                      setDepartmentFilter("ALL");
                      setPosFilter("ALL");
                      setStageFilter("ALL");
                      setStatusFilter("ALL");
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Filtreleri Temizle
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExcelExport}
                  disabled={filteredProcesses.length === 0}
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Excel'e Aktar
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 gap-2 border-b border-border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Arama</label>
                <input
                  type="text"
                  placeholder="İsim, pozisyon veya aşama..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Departman</label>
                <select
                  value={departmentFilter}
                  onChange={(event) => {
                    setDepartmentFilter(event.target.value);
                    setPosFilter("ALL");
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="ALL">Tüm Departmanlar</option>
                  {uniqueDepartments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Pozisyon</label>
                <select
                  value={posFilter}
                  onChange={(e) => setPosFilter(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="ALL">Tüm Pozisyonlar</option>
                  {uniquePositions
                    .filter((position) => departmentFilter === "ALL" || pipelineProcesses.some(
                      (row) => String(row.departmentId) === departmentFilter && row.positionTitle === position,
                    ))
                    .map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Aşama</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="ALL">Tüm Aşamalar</option>
                  {stages.map((st: any) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Durum</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="ON_HOLD">Beklemede</option>
                  <option value="HIRED">İşe Alındı</option>
                  <option value="REJECTED">Süreç sonlandı</option>
                </select>
              </div>
            </div>

            {/* Excel-like Table */}
            <div className="overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground">
                      <th className="px-4 py-3 min-w-[200px]">Aday</th>
                      <th className="px-4 py-3 min-w-[180px]">Başvurulan Pozisyon</th>
                      <th className="px-4 py-3 min-w-[220px]">Bulunduğu Aşama (Değiştirmek İçin Seçin)</th>
                      <th className="px-4 py-3 text-center min-w-[120px]">Süreç Durumu</th>
                      <th className="px-4 py-3 text-center">LinkedIn</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Güncelleme Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredProcesses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Kriterlere uygun aday bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredProcesses.map((row: any) => {
                        const statusColors: Record<string, string> = {
                          ACTIVE: "bg-blue-100 text-blue-800",
                          ON_HOLD: "bg-amber-100 text-amber-800",
                          HIRED: "bg-emerald-100 text-emerald-800",
                          REJECTED: "bg-red-100 text-red-800",
                        };

                        const statusLabels: Record<string, string> = {
                          ACTIVE: "Aktif",
                          ON_HOLD: "Beklemede",
                          HIRED: "İşe Alındı",
                          REJECTED: "Süreç sonlandı",
                        };

                        const formattedDate = row.updatedAt
                          ? new Date(row.updatedAt).toLocaleDateString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-";

                        const isUpdating = updatingProcessId === row.process.id;

                        return (
                          <tr key={row.process.id} className="hover:bg-accent/40 transition-colors">
                            {/* Candidate */}
                            <td className="px-4 py-2.5">
                              <CandidateIdentity
                                candidateId={row.candidate.id}
                                fullName={row.candidate.fullName}
                                firstName={row.candidate.firstName}
                                lastName={row.candidate.lastName}
                                subtitle={row.candidate.email}
                                compact
                              />
                            </td>

                            {/* Position */}
                            <td className="px-4 py-2.5 text-muted-foreground font-medium">
                              {row.positionTitle}
                            </td>

                            {/* Interactive Stage Dropdown */}
                            <td className="px-4 py-2.5">
                              <div className="relative flex items-center">
                                <select
                                  disabled={isUpdating || !canChangeCandidateStage}
                                  value={row.process.currentStageId}
                                  onChange={(e) => {
                                    const targetStageId = parseInt(e.target.value);
                                    const targetStage = stages.find((stage: any) => stage.id === targetStageId);
                                    setPendingStageChange({
                                      processId: row.process.id,
                                      candidateName: row.candidate.fullName,
                                      fromStage: row.process.currentStageName,
                                      targetStageId,
                                      toStage: targetStage?.name || "Yeni aşama",
                                    });
                                  }}
                                  className="w-full text-xs rounded-lg border border-border bg-background/50 px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium pr-8 cursor-pointer disabled:cursor-default disabled:opacity-70"
                                >
                                  {stages.map((st: any) => (
                                    <option key={st.id} value={st.id}>
                                      {st.displayOrder}. {st.name} ({st.stageType === "HIRED" ? "İşe Alım" : st.stageType === "REJECTED" ? "Red" : st.stageType === "ON_HOLD" ? "Bekletme" : "Aktif"})
                                    </option>
                                  ))}
                                </select>
                                {isUpdating && (
                                  <Loader2 className="absolute right-2.5 h-3.5 w-3.5 animate-spin text-primary" />
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-2.5 text-center">
                              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", statusColors[row.process.currentStageType] || "bg-muted text-muted-foreground")}>
                                {statusLabels[row.process.currentStageType] || row.process.currentStageType || "-"}
                              </span>
                            </td>

                            {/* LinkedIn Link */}
                            <td className="px-4 py-2.5 text-center">
                              <LinkedInLink url={row.candidate.linkedinUrl} />
                            </td>

                            {/* Date */}
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground text-[10px]">
                              {formattedDate}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </>
      )}

      <Dialog open={showPipelineOverview} onOpenChange={setShowPipelineOverview}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 pr-8">
              <DialogTitle>{selectedPipeline?.name || "İşe alım süreci detayı"}</DialogTitle>
              {selectedPipeline?.defaultPipeline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Star className="h-3 w-3" /> Varsayılan
                </span>
              )}
            </div>
            <DialogDescription>
              {selectedPipeline?.description || "Bu işe alım süreci için tanımlanmış özet bilgiler."}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : selectedPipeline ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">İşe alım süreci kodu</span>
                <span className="font-mono text-xs font-medium text-foreground">{selectedPipeline.code}</span>
              </div>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border sm:grid-cols-4">
                <div className="border-b border-r border-border p-3 sm:border-b-0">
                  <p className="text-lg font-semibold">{stages.length}</p>
                  <p className="text-xs text-muted-foreground">Toplam aşama</p>
                </div>
                <div className="border-b border-border p-3 sm:border-b-0 sm:border-r">
                  <p className="text-lg font-semibold text-blue-600">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Aktif aday</p>
                </div>
                <div className="border-r border-border p-3">
                  <p className="text-lg font-semibold text-emerald-600">{stats.hired}</p>
                  <p className="text-xs text-muted-foreground">İşe alınan</p>
                </div>
                <div className="p-3">
                  <p className="text-lg font-semibold text-red-500">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Süreci sonlanan</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <EditPipelineDialog
        open={showEditPipeline && canManagePipeline}
        pipeline={selectedPipeline}
        saving={editPipelineSaving || detailLoading}
        onOpenChange={setShowEditPipeline}
        onSave={handleUpdatePipeline}
      />

      <StageChangeDialog
        open={Boolean(pendingStageChange)}
        candidateName={pendingStageChange?.candidateName || "Aday"}
        fromStage={pendingStageChange?.fromStage}
        toStage={pendingStageChange?.toStage}
        loading={updatingProcessId !== null}
        onOpenChange={(open) => !open && setPendingStageChange(null)}
        onConfirm={handleStageChange}
      />

      {/* ===== CREATE PIPELINE DIALOG ===== */}
      {showCreateDialog && canManagePipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GitBranch className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground">Yeni işe alım süreci</h2>
              </div>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePipeline} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  İşe alım süreci adı <span className="text-destructive">*</span>
                </label>
                <input
                  id="pipeline-name-input"
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => {
                    setNewPipelineName(e.target.value);
                    setNewPipelineCode(generateEntityCode(e.target.value));
                  }}
                  placeholder="İşe alım süreci adını girin"
                  required
                  className="w-full rounded-xl bg-input/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Açıklama <span className="text-muted-foreground font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  id="pipeline-desc-input"
                  value={newPipelineDesc}
                  onChange={(e) => setNewPipelineDesc(e.target.value)}
                  placeholder="İşe alım süreci hakkında kısa açıklama..."
                  rows={2}
                  className="w-full rounded-xl bg-input/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <input
                  id="pipeline-default-input"
                  type="checkbox"
                  checked={newPipelineDefault}
                  onChange={(e) => setNewPipelineDefault(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <label htmlFor="pipeline-default-input" className="text-sm text-foreground cursor-pointer">
                  <span className="font-medium">Varsayılan işe alım süreci olarak ayarla</span>
                  <span className="block text-xs text-muted-foreground">Yeni pozisyonlar bu işe alım süreci ile otomatik eşleşir.</span>
                </label>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">İşe alım süreci aşamaları</p>
                    <p className="text-xs text-muted-foreground">Yalnızca burada tanımladığınız aşamalar oluşturulur.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPipelineStages((stages) => [...stages, emptyStage()])}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Aşama ekle
                  </button>
                </div>

                <div className="space-y-3">
                  {newPipelineStages.map((stage, index) => (
                    <div key={index} className="rounded-lg border border-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{index + 1}. aşama</span>
                        <button
                          type="button"
                          onClick={() => setNewPipelineStages((stages) => stages.filter((_, stageIndex) => stageIndex !== index))}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${index + 1}. aşamayı kaldır`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={stage.name}
                          onChange={(event) => setNewPipelineStages((stages) => stages.map((item, stageIndex) => stageIndex === index ? { ...item, name: event.target.value, code: generateEntityCode(event.target.value) } : item))}
                          placeholder="Aşama adı"
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none sm:col-span-2"
                        />
                        <select
                          value={stage.stageType}
                          onChange={(event) => setNewPipelineStages((stages) => stages.map((item, stageIndex) => stageIndex === index ? { ...item, stageType: event.target.value as StageDraft["stageType"] } : item))}
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        >
                          <option value="ACTIVE">Aktif süreç</option>
                          <option value="ON_HOLD">Beklemede</option>
                          <option value="HIRED">İşe alındı</option>
                          <option value="REJECTED">Süreç sonlandı</option>
                        </select>
                        <input
                          value={stage.description}
                          onChange={(event) => setNewPipelineStages((stages) => stages.map((item, stageIndex) => stageIndex === index ? { ...item, description: event.target.value } : item))}
                          placeholder="Açıklama (isteğe bağlı)"
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  {newPipelineStages.length === 0 && (
                    <p className="rounded-md border border-dashed border-border py-5 text-center text-sm text-muted-foreground">
                      Henüz aşama eklenmedi.
                    </p>
                  )}
                </div>
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
                  id="submit-pipeline-btn"
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DEACTIVATE CONFIRMATION ===== */}
      {deactivateTargetId !== null && canManagePipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-slide-up">
            <div className="px-6 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">İşe alım sürecini sil</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Bu işe alım sürecini silmek istediğinize emin misiniz? Mevcut aday süreçleri etkilenmeyecektir.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeactivateTargetId(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all"
              >
                İptal
              </button>
              <button
                id="confirm-deactivate-pipeline-btn"
                onClick={handleDeactivate}
                disabled={deactivateLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-white hover:bg-destructive/90 transition-all disabled:opacity-50"
              >
                {deactivateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
