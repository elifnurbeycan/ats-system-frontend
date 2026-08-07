import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Search,
  Mail,
  Phone,
  MapPin,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { candidateApi, pipelineApi, positionApi, departmentApi, candidateProcessApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateIdentity } from "@/components/candidate/CandidateIdentity";
import { LinkedInLink } from "@/components/candidate/LinkedInLink";
import { hasPermission } from "@/lib/permissions";
import { exportExcel } from "@/lib/excel";
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

export default function Candidates() {
  const canCreateCandidate = hasPermission("CANDIDATE_CREATE");
  const canUpdateCandidate = hasPermission("CANDIDATE_UPDATE");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selectedStageId, setSelectedStageId] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    linkedinUrl: "",
    departmentId: "",
    positionId: "",
    pipelineId: "",
  });

  // Edit Candidate Dialog State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null as number | null,
    firstName: "",
    lastName: "",
    linkedinUrl: "",
    email: "",
    phone: "",
    city: "",
    currentCompany: "",
    currentJobTitle: "",
    noticePeriodDays: 0 as number | string,
  });

  // Delete Candidate Confirmation State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletingCandidateId, setDeletingCandidateId] = useState<number | null>(null);
  const [deletingCandidateName, setDeletingCandidateName] = useState("");

  const handleOpenEdit = (c: any) => {
    setEditForm({
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      linkedinUrl: c.linkedinUrl || "",
      email: c.email || "",
      phone: c.phone || "",
      city: c.city || "",
      currentCompany: c.currentCompany || "",
      currentJobTitle: c.currentJobTitle || "",
      noticePeriodDays: c.noticePeriodDays != null ? c.noticePeriodDays : 0,
    });
    setShowEditDialog(true);
  };

  const handleOpenDelete = (c: any) => {
    setDeletingCandidateId(c.id);
    setDeletingCandidateName(`${c.firstName} ${c.lastName}`);
    setShowDeleteDialog(true);
  };

  const handleEditCandidate = async () => {
    if (!editForm.id || !editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error("Lütfen ad ve soyadı alanlarını doldurun.");
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        linkedinUrl: editForm.linkedinUrl.trim() || undefined,
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        city: editForm.city.trim() || undefined,
        currentCompany: editForm.currentCompany.trim() || undefined,
        currentJobTitle: editForm.currentJobTitle.trim() || undefined,
        noticePeriodDays: editForm.noticePeriodDays !== "" ? parseInt(String(editForm.noticePeriodDays)) : 0,
      };

      await candidateApi.update(editForm.id, payload);
      toast.success("Aday bilgileri güncellendi.");
      setShowEditDialog(false);
      loadData();
    } catch (err: any) {
      toast.error("Aday güncellenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeactivateCandidate = async () => {
    if (!deletingCandidateId) return;

    setDeleteSubmitting(true);
    try {
      await candidateApi.deactivate(deletingCandidateId);
      toast.success("Aday silindi.");
      setShowDeleteDialog(false);
      loadData();
    } catch (err: any) {
      toast.error("Aday silinemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setDeleteSubmitting(false);
      setDeletingCandidateId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load static resources first — dropdowns must render
      const [pipelinesData, positionsData, departmentsData] = await Promise.all([
        pipelineApi.getAll(),
        positionApi.getAll(),
        departmentApi.getAll(),
      ]);
      const pipelineDetails = await Promise.all(
        pipelinesData.map((pipeline) => pipelineApi.getById(pipeline.id)),
      );
      setPipelines(pipelineDetails);
      setPositions(positionsData.filter(p => p.status === "OPEN"));
      setDepartments(departmentsData.filter(d => d.active));
    } catch (err: any) {
      toast.error("Referans veriler yüklenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }

    // Load candidates separately — failures should be caught and logged
    try {
      const candidatesData = await candidateApi.getAll();
      const detailedCandidates = await Promise.all(
        candidatesData.map(async (c) => {
          try {
            const detail = await candidateApi.getById(c.id);
            return detail;
          } catch {
            return { candidate: c, processes: [] };
          }
        })
      );
      setCandidates(detailedCandidates);
    } catch (err: any) {
      // Show warning toast for candidate loading specifically
      toast.warning("Aday listesi yüklenemedi: " + (err.response?.data?.message || err.message || "Erişim yetkiniz yok"));
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem("user_data") || "null");
      if (user?.roles?.includes("DEPARTMENT_MANAGER") && user.departmentId) {
        setDepartmentFilter(String(user.departmentId));
      }
    } catch {
      // Geçersiz oturum verisinde varsayılan olarak tüm departmanlar seçili kalır.
    }
  }, []);

  const allStages = useMemo(() => {
    return pipelines.flatMap(p => p.stages || []);
  }, [pipelines]);

  const candidatesWithStage = useMemo(() => {
    return candidates.flatMap((d) => {
      const c = d.candidate;
      const processes = d.processes || [];

      if (processes.length === 0) {
        return [{
          ...c,
          rowKey: `candidate-${c.id}`,
          candidateProcessId: null,
          stage: undefined,
          stageType: "ACTIVE",
          position: undefined,
        }];
      }

      return processes.map((process: any) => {
        const matchedStage = allStages.find(s => s.id === process.currentStageId);
        const stage = matchedStage
          ? { id: matchedStage.id, name: matchedStage.name, stageType: matchedStage.stageType }
          : { id: process.currentStageId, name: process.currentStageName, stageType: "ACTIVE" };
        const positionDetails = positions.find(p => p.id === process.positionId);
        const position = {
          title: process.positionTitle,
          id: process.positionId,
          departmentId: positionDetails?.departmentId,
          departmentName: positionDetails?.departmentName,
        };

        return {
          ...c,
          rowKey: `process-${process.id}`,
          candidateProcessId: process.id,
          pipelineId: process.pipelineId,
          pipelineName: process.pipelineName,
          stage,
          stageType: matchedStage?.stageType || "ACTIVE",
          position,
        };
      });
    });
  }, [candidates, allStages, positions]);

  const createPositions = useMemo(() => {
    if (!createForm.departmentId) return [];
    return positions.filter(
      (position) => String(position.departmentId) === createForm.departmentId,
    );
  }, [positions, createForm.departmentId]);

  const departmentCandidates = useMemo(() => {
    if (departmentFilter === "ALL") return candidatesWithStage;
    return candidatesWithStage.filter(
      (candidate) => String(candidate.position?.departmentId) === departmentFilter,
    );
  }, [candidatesWithStage, departmentFilter]);

  const stagesWithCounts = useMemo(() => {
    return allStages
      .filter((stage, index, stages) => stages.findIndex((item) => item.id === stage.id) === index)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((stage) => ({
        ...stage,
        candidateCount: departmentCandidates.filter(
          (candidate) => String(candidate.stage?.id) === String(stage.id),
        ).length,
      }));
  }, [allStages, departmentCandidates]);

  const filtered = useMemo(() => {
    let result = departmentCandidates.filter((c) => {
      const matchesSearch =
        !search ||
        `${c.firstName} ${c.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.currentJobTitle?.toLowerCase().includes(search.toLowerCase()) ||
        (c.position?.title || "").toLowerCase().includes(search.toLowerCase());

      const matchesStage =
        stageFilter === "ALL" || c.stageType === stageFilter;

      const matchesSelectedStage =
        selectedStageId === "ALL" || String(c.stage?.id) === selectedStageId;

      return matchesSearch && matchesStage && matchesSelectedStage;
    });

    // Sort
    result.sort((a, b) => {
      let valA: string, valB: string;
      switch (sortField) {
        case "name":
          valA = `${a.firstName} ${a.lastName}`;
          valB = `${b.firstName} ${b.lastName}`;
          break;
        case "position":
          valA = a.position?.title || "";
          valB = b.position?.title || "";
          break;
        case "company":
          valA = a.currentCompany || "";
          valB = b.currentCompany || "";
          break;
        case "stage":
          valA = a.stage?.name || "";
          valB = b.stage?.name || "";
          break;
        case "city":
          valA = a.city || "";
          valB = b.city || "";
          break;
        default:
          valA = `${a.firstName} ${a.lastName}`;
          valB = `${b.firstName} ${b.lastName}`;
      }
      const cmp = valA.localeCompare(valB, "tr");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [departmentCandidates, search, stageFilter, selectedStageId, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const exportCandidates = async () => {
    if (filtered.length === 0) {
      toast.error("Excel'e aktarılacak aday bulunamadı.");
      return;
    }
    await exportExcel(filtered.map((candidate) => ({
      "Aday": `${candidate.firstName} ${candidate.lastName}`,
      "E-posta": candidate.email,
      "Telefon": candidate.phone,
      "Şehir": candidate.city,
      "Mevcut Şirket": candidate.currentCompany,
      "Mevcut Pozisyon": candidate.currentJobTitle,
      "Başvurulan Pozisyon": candidate.position?.title,
      "Departman": candidate.position?.departmentName,
      "Pipeline": candidate.pipelineName,
      "Aşama": candidate.stage?.name,
      "Süreç Durumu": candidate.stageType === "HIRED" ? "İşe Alındı" : candidate.stageType === "REJECTED" ? "Reddedildi" : candidate.stageType === "ON_HOLD" ? "Beklemede" : "Aktif",
      "LinkedIn": candidate.linkedinUrl,
      "İhbar Süresi (Gün)": candidate.noticePeriodDays,
    })), "aday-raporu", "Adaylar");
    toast.success(`${filtered.length} başvuru Excel'e aktarıldı.`);
  };

  const handleCreateCandidate = async () => {
    const { firstName, lastName, departmentId, positionId, pipelineId } = createForm;
    if (!firstName || !lastName || !departmentId || !positionId || !pipelineId) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }

    setSubmitting(true);
    try {
      await candidateProcessApi.create({
        firstName,
        lastName,
        linkedinUrl: createForm.linkedinUrl || undefined,
        positionId: parseInt(positionId),
        pipelineId: parseInt(pipelineId),
      });
      toast.success("Aday başarıyla eklendi.");
      setShowCreateDialog(false);
      setCreateForm({
        firstName: "",
        lastName: "",
        linkedinUrl: "",
        departmentId: "",
        positionId: "",
        pipelineId: "",
      });
      loadData();
    } catch (err: any) {
      toast.error("Aday eklenemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setSubmitting(false);
    }
  };

  const stageFilters: { value: string; label: string }[] = [
    { value: "ALL", label: "Tümü" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "ON_HOLD", label: "Beklemede" },
    { value: "HIRED", label: "İşe Alındı" },
    { value: "REJECTED", label: "Reddedildi" },
  ];

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary" />
      : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  if (loading && candidates.length === 0) {
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
            Adaylar
          </h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} başvuru listeleniyor
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={exportCandidates} className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
            <Download className="h-4 w-4" /> Excel'e Aktar
          </button>
          {canCreateCandidate && <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all duration-200 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Yeni Aday
          </button>}
        </div>
      </div>

      {/* Stage overview */}
      {stagesWithCounts.length > 0 && (
        <section className="enterprise-panel p-4 animate-slide-up" style={{ animationDelay: "75ms" }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Aşamalara Göre Adaylar</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bir aşamaya tıklayarak o aşamadaki adayları listeleyin.
              </p>
            </div>
            {selectedStageId !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedStageId("ALL")}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Tüm adayları göster
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {stagesWithCounts.map((stage) => {
              const isSelected = selectedStageId === String(stage.id);
              const colorClass = stage.stageType === "HIRED"
                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/35"
                : stage.stageType === "REJECTED"
                  ? "border-rose-200 bg-rose-50/70 dark:border-rose-800/70 dark:bg-rose-950/35"
                  : stage.stageType === "ON_HOLD"
                    ? "border-amber-200 bg-amber-50/70 dark:border-amber-800/70 dark:bg-amber-950/30"
                    : "border-blue-200 bg-blue-50/60 dark:border-blue-800/70 dark:bg-blue-950/30";

              return (
                <button
                  type="button"
                  key={stage.id}
                  aria-pressed={isSelected}
                  aria-label={`${stage.name} aşamasındaki ${stage.candidateCount} başvuruyu göster`}
                  onClick={() => {
                    setSelectedStageId(isSelected ? "ALL" : String(stage.id));
                    setStageFilter("ALL");
                    window.requestAnimationFrame(() => {
                      document.getElementById("candidate-list")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }}
                  className={cn(
                    "flex min-h-24 min-w-40 flex-1 flex-col justify-between rounded-lg border p-3 text-left transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    colorClass,
                    isSelected && "border-primary ring-1 ring-primary shadow-sm",
                  )}
                >
                  <div>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/70 bg-background/70 px-1 font-mono text-[10px] font-semibold text-muted-foreground">
                      {stage.displayOrder}
                    </span>
                    <div className="mt-2 line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                      {stage.name}
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-mono text-base font-bold text-foreground">
                      {stage.candidateCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground">başvuru</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, e-posta, pozisyon ara..."
            className="w-full rounded-xl bg-input/50 border border-border pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
          />
        </div>
        <Select
          value={departmentFilter}
          onValueChange={(value) => {
            setDepartmentFilter(value);
            setSelectedStageId("ALL");
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Departman seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm Departmanlar</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={String(department.id)}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 overflow-x-auto">
          {stageFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStageFilter(f.value)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200",
                stageFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-input/30 text-muted-foreground border border-border hover:text-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div id="candidate-list" className="glass scroll-mt-4 rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "200ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Aday <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  <button onClick={() => handleSort("position")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Başvurulan Pozisyon <SortIcon field="position" />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  <button onClick={() => handleSort("company")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Mevcut Şirket <SortIcon field="company" />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  E-posta
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  Telefon
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  LinkedIn
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  <button onClick={() => handleSort("city")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Şehir <SortIcon field="city" />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-4">
                  <button onClick={() => handleSort("stage")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Aşama <SortIcon field="stage" />
                  </button>
                </th>
                <th className="px-5 py-4 w-28 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((candidate, i) => {
                const stageColor =
                  candidate.stageType === "HIRED"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : candidate.stageType === "REJECTED"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : candidate.stageType === "ON_HOLD"
                    ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                    : "bg-chart-2/10 text-chart-2 border-chart-2/20";

                return (
                  <tr
                    key={candidate.rowKey}
                    className="border-b border-border last:border-0 hover:bg-accent/30 transition-all duration-150 group"
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    {/* Aday */}
                    <td className="px-5 py-3.5">
                      <CandidateIdentity
                        candidateId={candidate.id}
                        fullName={candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}
                        firstName={candidate.firstName}
                        lastName={candidate.lastName}
                        subtitle={candidate.currentJobTitle || "İş Unvanı Yok"}
                      />
                    </td>

                    {/* Pozisyon */}
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">
                          {candidate.position?.title || "—"}
                        </div>
                        {candidate.position?.departmentName && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {candidate.position.departmentName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Mevcut Şirket */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {candidate.currentCompany || "—"}
                      </span>
                    </td>

                    {/* E-posta */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {candidate.email || "—"}
                        </span>
                      </div>
                    </td>

                    {/* Telefon */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{candidate.phone || "—"}</span>
                      </div>
                    </td>

                    {/* LinkedIn */}
                    <td className="px-5 py-3.5">
                      <LinkedInLink url={candidate.linkedinUrl} />
                    </td>

                    {/* Şehir */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {candidate.city || "—"}
                      </div>
                    </td>

                    {/* Aşama */}
                    <td className="px-5 py-3.5">
                      {candidate.stage ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                            stageColor
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {candidate.stage.name.length > 22
                            ? candidate.stage.name.split(" /")[0]
                            : candidate.stage.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/adaylar/${candidate.id}`} title="Detayları Görüntüle">
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
                        </Link>
                        {canUpdateCandidate && <button
                          onClick={() => handleOpenEdit(candidate)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded hover:bg-accent"
                          title="Adayı Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>}
                        {canUpdateCandidate && <button
                          onClick={() => handleOpenDelete(candidate)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded hover:bg-accent"
                          title="Adayı sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Aday bulunamadı.</p>
          </div>
        )}
      </div>

      {/* New Candidate Dialog */}
      <Dialog open={showCreateDialog && canCreateCandidate} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Yeni Aday Ekle</DialogTitle>
            <DialogDescription>
              Adayı sisteme kaydedin ve işe alım sürecine dahil edin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Adı *</label>
                <Input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  placeholder="Ahmet"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Soyadı *</label>
                <Input
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  placeholder="Yılmaz"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">LinkedIn Profil Adresi</label>
              <Input
                value={createForm.linkedinUrl}
                onChange={(e) => setCreateForm({ ...createForm, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Departman *</label>
              <Select
                value={createForm.departmentId}
                onValueChange={(val) =>
                  setCreateForm({ ...createForm, departmentId: val, positionId: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectItem value="none" disabled>Aktif departman bulunmuyor</SelectItem>
                  ) : (
                    departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Başvurulan Pozisyon *</label>
              <Select
                value={createForm.positionId}
                onValueChange={(val) => setCreateForm({ ...createForm, positionId: val })}
                disabled={!createForm.departmentId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={createForm.departmentId ? "Pozisyon seçin" : "Önce departman seçin"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {createPositions.length === 0 ? (
                    <SelectItem value="none" disabled>Bu departmanda açık pozisyon bulunmuyor</SelectItem>
                  ) : (
                    createPositions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Süreç Pipeline *</label>
              <Select
                value={createForm.pipelineId}
                onValueChange={(val) => setCreateForm({ ...createForm, pipelineId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pipeline seçin" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.length === 0 ? (
                    <SelectItem value="none" disabled>Pipeline bulunmuyor</SelectItem>
                  ) : (
                    pipelines.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreateCandidate}
              disabled={submitting}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ekleniyor
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Dialog */}
      <Dialog open={showEditDialog && canUpdateCandidate} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Aday Bilgilerini Düzenle</DialogTitle>
            <DialogDescription>
              Adayın profil bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adı *</label>
              <Input
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                placeholder="Adı"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Soyadı *</label>
              <Input
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                placeholder="Soyadı"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">LinkedIn Profil Adresi</label>
              <Input
                value={editForm.linkedinUrl}
                onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">E-posta</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="example@mail.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefon</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+90 555..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Şehir</label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                placeholder="İstanbul"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mevcut Şirket</label>
              <Input
                value={editForm.currentCompany}
                onChange={(e) => setEditForm({ ...editForm, currentCompany: e.target.value })}
                placeholder="Mevcut Şirket"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mevcut Unvan</label>
              <Input
                value={editForm.currentJobTitle}
                onChange={(e) => setEditForm({ ...editForm, currentJobTitle: e.target.value })}
                placeholder="Geliştirici"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">İhbar Süresi (Gün)</label>
              <Input
                type="number"
                value={editForm.noticePeriodDays}
                onChange={(e) => setEditForm({ ...editForm, noticePeriodDays: e.target.value })}
                placeholder="30"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleEditCandidate}
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

      {/* Delete Candidate Confirmation Dialog */}
      <Dialog open={showDeleteDialog && canUpdateCandidate} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Adayı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deletingCandidateName}</strong> isimli adayı silmek istediğinize emin misiniz? Bu aday süreç listelerinden kaldırılacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleDeactivateCandidate}
              disabled={deleteSubmitting}
              variant="destructive"
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Siliniyor
                </>
              ) : (
                "Evet, Sil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
