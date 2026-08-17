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
  FileText,
  Upload,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateCv } from "@/lib/api";
import { candidateApi } from "@/lib/api/candidate-api";
import { pipelineApi } from "@/lib/api/pipeline-api";
import { positionApi } from "@/lib/api/position-api";
import { departmentApi } from "@/lib/api/department-api";
import { candidateProcessApi } from "@/lib/api/process-api";
import { contactLeadApi } from "@/lib/api/contact-lead-api";
import { CandidatePagination } from "@/components/candidate/CandidatePagination";
import { CreateCandidateDialog } from "@/components/candidate/CreateCandidateDialog";
import { DeleteCandidateDialog } from "@/components/candidate/DeleteCandidateDialog";
import { EditCandidateDialog } from "@/components/candidate/EditCandidateDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateIdentity } from "@/components/candidate/CandidateIdentity";
import { LinkedInLink } from "@/components/candidate/LinkedInLink";
import { hasPermission } from "@/lib/permissions";
import { exportExcel } from "@/lib/excel";
import { useApplicationContract } from "@/hooks/use-application-contract";
import { formatFileSize, isAllowedFile } from "@/lib/api/application-contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Candidates() {
  const applicationContract = useApplicationContract();
  const candidatePageSize = applicationContract.pagination.defaultPageSize;
  const canCreateCandidate = hasPermission("CANDIDATE_CREATE");
  const canUpdateCandidate = hasPermission("CANDIDATE_UPDATE");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selectedStageId, setSelectedStageId] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [showDeleted, setShowDeleted] = useState(false);
  const [candidatePage, setCandidatePage] = useState(0);
  const [candidateTotalPages, setCandidateTotalPages] = useState(0);
  const [candidateTotalElements, setCandidateTotalElements] = useState(0);
  const [serverSort, setServerSort] = useState("createdAt-desc");
  const [sortField, setSortField] = useState<string>("");
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
  const [editCv, setEditCv] = useState<CandidateCv | null>(null);
  const [editCvFile, setEditCvFile] = useState<File | null>(null);
  const [editCvLoading, setEditCvLoading] = useState(false);
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

  const handleOpenEdit = async (c: any) => {
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
    setEditCv(null);
    setEditCvFile(null);
    setShowEditDialog(true);
    setEditCvLoading(true);
    try {
      setEditCv(await candidateApi.getCv(c.id));
    } catch (err: any) {
      toast.error("CV bilgisi yüklenemedi: " + (err.response?.data?.message || err.message));
    } finally {
      setEditCvLoading(false);
    }
  };

  const handleCvSelection = (file?: File) => {
    if (!file) return setEditCvFile(null);
    if (!isAllowedFile(file, applicationContract.candidateCv)) {
      toast.error(`CV yalnızca ${applicationContract.candidateCv.allowedExtensions.join(", ")} formatında yüklenebilir.`);
      return;
    }
    if (file.size > applicationContract.candidateCv.maxFileSizeBytes) {
      toast.error(`CV dosyası en fazla ${formatFileSize(applicationContract.candidateCv.maxFileSizeBytes)} olabilir.`);
      return;
    }
    setEditCvFile(file);
  };

  const handleDeleteCv = async () => {
    if (!editForm.id || !editCv || !window.confirm("Adayın CV dosyası silinsin mi?")) return;
    try {
      await candidateApi.deleteCv(editForm.id);
      setEditCv(null);
      toast.success("CV silindi.");
    } catch (err: any) {
      toast.error("CV silinemedi: " + (err.response?.data?.message || err.message));
    }
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
      if (editCvFile) await candidateApi.uploadCv(editForm.id, editCvFile);
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

  const handleRestoreCandidate = async (candidateId: number) => {
    try {
      await candidateApi.activate(candidateId);
      toast.success("Aday geri yüklendi.");
      loadData();
    } catch (err: any) {
      toast.error("Aday geri yüklenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
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
      const [sortBy, sortDirection] = serverSort.split("-") as ["name" | "createdAt", "asc" | "desc"];
      const candidatePageData = await candidateApi.getPage({
        includeInactive: showDeleted,
        page: showDeleted ? 0 : candidatePage,
        size: showDeleted ? applicationContract.pagination.maxPageSize : candidatePageSize,
        sortBy,
        sortDirection,
      });
      const candidatesData = candidatePageData.content;
      setCandidateTotalPages(showDeleted ? 1 : candidatePageData.totalPages);
      setCandidateTotalElements(candidatePageData.totalElements);
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
  }, [candidatePage, showDeleted, serverSort, candidatePageSize, applicationContract.pagination.maxPageSize]);

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
    return pipelines.flatMap(p => (p.stages || []).filter((stage: any) => stage.active !== false));
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

      const matchesDeleted = showDeleted ? !c.active : c.active;

      return matchesSearch && matchesStage && matchesSelectedStage && matchesDeleted;
    });

    // Tablo başlığıyla ayrıca sıralama seçilmişse mevcut sayfa üzerinde uygula.
    if (sortField) result.sort((a, b) => {
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
  }, [departmentCandidates, search, stageFilter, selectedStageId, showDeleted, sortField, sortDir]);

  const visiblePageNumbers = useMemo(() => {
    if (candidateTotalPages <= 7) {
      return Array.from({ length: candidateTotalPages }, (_, index) => index);
    }

    const start = Math.max(0, Math.min(candidatePage - 2, candidateTotalPages - 5));
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [candidatePage, candidateTotalPages]);

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
      await contactLeadApi.create({
        firstName,
        lastName,
        linkedinUrl: createForm.linkedinUrl || undefined,
        positionId: parseInt(positionId),
        pipelineId: parseInt(pipelineId),
      });
      toast.success("Kişi iletişim havuzuna eklendi. Olumlu dönüşten sonra aday süreci başlayacak.");
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
            {showDeleted ? filtered.length : candidateTotalElements} aday listeleniyor
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
        <Select
          value={serverSort}
          onValueChange={(value) => {
            setServerSort(value);
            setCandidatePage(0);
            setSortField("");
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Sıralama" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">En son eklenen</SelectItem>
            <SelectItem value="createdAt-asc">En eski eklenen</SelectItem>
            <SelectItem value="name-asc">Ada göre A-Z</SelectItem>
            <SelectItem value="name-desc">Ada göre Z-A</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 overflow-x-auto">
          {canUpdateCandidate && (
            <button
              onClick={() => {
                setShowDeleted((value) => !value);
                setCandidatePage(0);
              }}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap border transition-colors",
                showDeleted ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {showDeleted ? "Aktif adaylar" : "Silinen adaylar"}
            </button>
          )}
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
                        {canUpdateCandidate && candidate.active && <button
                          onClick={() => handleOpenEdit(candidate)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded hover:bg-accent"
                          title="Adayı Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>}
                        {canUpdateCandidate && candidate.active && <button
                          onClick={() => handleOpenDelete(candidate)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded hover:bg-accent"
                          title="Adayı sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>}
                        {canUpdateCandidate && !candidate.active && <button
                          onClick={() => handleRestoreCandidate(candidate.id)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded hover:bg-accent"
                          title="Adayı geri yükle"
                        >
                          <RotateCcw className="h-4 w-4" />
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
        {!showDeleted && <CandidatePagination page={candidatePage} totalPages={candidateTotalPages} loading={loading} onPageChange={setCandidatePage} />}
      </div>

      <CreateCandidateDialog
        open={showCreateDialog && canCreateCandidate}
        form={createForm}
        departments={departments}
        positions={createPositions}
        pipelines={pipelines}
        submitting={submitting}
        onOpenChange={setShowCreateDialog}
        onFormChange={setCreateForm}
        onSave={handleCreateCandidate}
      />
      <EditCandidateDialog
        open={showEditDialog && canUpdateCandidate}
        form={editForm}
        cv={editCv}
        cvFile={editCvFile}
        cvLoading={editCvLoading}
        submitting={editSubmitting}
        cvContract={applicationContract.candidateCv}
        onOpenChange={setShowEditDialog}
        onFormChange={setEditForm}
        onCvSelection={handleCvSelection}
        onCvDownload={() => editForm.id && editCv && candidateApi.downloadCv(editForm.id, editCv.fileName)}
        onCvDelete={handleDeleteCv}
        onSave={handleEditCandidate}
      />


      <DeleteCandidateDialog
        open={showDeleteDialog && canUpdateCandidate}
        candidateName={deletingCandidateName}
        submitting={deleteSubmitting}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeactivateCandidate}
      />
    </div>
  );
}
