import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Star,
  FileText,
  MessageSquare,
  Calendar,
  Globe,
  Loader2,
  Pencil,
  Save,
  PauseCircle,
  LockKeyhole,
  Upload,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateCv, CandidateDetail, CandidateStageHistory } from "@/lib/api";
import { candidateApi } from "@/lib/api/candidate-api";
import { pipelineApi } from "@/lib/api/pipeline-api";
import { candidateProcessApi } from "@/lib/api/process-api";
import { toast } from "sonner";
import { LinkedInLink } from "@/components/candidate/LinkedInLink";
import { StageChangeDialog } from "@/components/candidate/StageChangeDialog";
import { CandidateProfile } from "@/components/candidate/CandidateProfile";
import { CandidateSidebar } from "@/components/candidate/CandidateSidebar";
import { EditCandidateProfileDialog } from "@/components/candidate/EditCandidateProfileDialog";
import { hasPermission } from "@/lib/permissions";
import { useApplicationContract } from "@/hooks/use-application-contract";
import { formatFileSize, isAllowedFile } from "@/lib/api/application-contract";

export default function CandidateDetail() {
  const applicationContract = useApplicationContract();
  const canUpdateCandidate = hasPermission("CANDIDATE_UPDATE");
  const canChangeCandidateStage = hasPermission("CANDIDATE_STAGE_CHANGE");
  const canUpdateCompensation = hasPermission("CANDIDATE_COMPENSATION_UPDATE");
  const { id } = useParams();
  const candidateId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState<"profil" | "surec" | "notlar">("profil");

  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [stageHistory, setStageHistory] = useState<CandidateStageHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingStageChange, setPendingStageChange] = useState<{
    processId: number;
    fromStage: string;
    applicationLabel: string;
    targetStageId: number;
    targetStageName: string;
    successMessage: string;
    errorPrefix: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [candidateCv, setCandidateCv] = useState<CandidateCv | null>(null);
  const [profileCvFile, setProfileCvFile] = useState<File | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", city: "", linkedinUrl: "",
    currentCompany: "", currentJobTitle: "", noticePeriodDays: "",
  });
  const [compensationAllowed, setCompensationAllowed] = useState(false);
  const [compensationLoading, setCompensationLoading] = useState(false);
  const [compensationSaving, setCompensationSaving] = useState(false);
  const [compensationForm, setCompensationForm] = useState({
    currentSalary: "", expectedSalary: "", offeredSalary: "", salaryCurrency: "TRY",
  });

  const loadCandidateData = async () => {
    setLoading(true);
    try {
      const [detailData, pipelineSummaries, cvData] = await Promise.all([
        candidateApi.getById(candidateId),
        pipelineApi.getAll(),
        candidateApi.getCv(candidateId),
      ]);
      const pipelinesData = await Promise.all(
        pipelineSummaries.map((pipeline) => pipelineApi.getById(pipeline.id))
      );
      setDetail(detailData);
      setCandidateCv(cvData);
      setPipelines(pipelinesData);
    } catch (err: any) {
      toast.error("Aday detayları yüklenemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      loadCandidateData();
    }
  }, [candidateId]);

  const candidate = detail?.candidate;
  const processes = detail?.processes || [];
  const selectedProcess = processes.find((process) => process.id === selectedProcessId) || processes[0];

  useEffect(() => {
    if (processes.length > 0 && !processes.some((process) => process.id === selectedProcessId)) {
      setSelectedProcessId(processes[0].id);
    }
  }, [processes, selectedProcessId]);

  useEffect(() => {
    if (!selectedProcess?.id) return;
    let active = true;
    setCompensationLoading(true);
    candidateProcessApi.getCompensation(selectedProcess.id)
      .then((data) => {
        if (!active) return;
        setCompensationAllowed(true);
        setCompensationForm({
          currentSalary: data.currentSalary == null ? "" : String(data.currentSalary),
          expectedSalary: data.expectedSalary == null ? "" : String(data.expectedSalary),
          offeredSalary: data.offeredSalary == null ? "" : String(data.offeredSalary),
          salaryCurrency: data.salaryCurrency || "TRY",
        });
      })
      .catch(() => active && setCompensationAllowed(false))
      .finally(() => active && setCompensationLoading(false));
    return () => { active = false; };
  }, [selectedProcess?.id]);

  useEffect(() => {
    if (!selectedProcess?.id) {
      setStageHistory([]);
      return;
    }

    let active = true;
    setHistoryLoading(true);
    candidateProcessApi.getStageHistory(selectedProcess.id)
      .then((history) => {
        if (active) setStageHistory(history);
      })
      .catch((err: any) => {
        if (active) {
          setStageHistory([]);
          toast.error("Süreç notları yüklenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
        }
      })
      .finally(() => active && setHistoryLoading(false));

    return () => {
      active = false;
    };
  }, [selectedProcess?.id, historyRefreshKey]);

  // Find the pipeline and stages for the explicitly selected application process.
  const activePipeline = useMemo(() => {
    if (!selectedProcess) return null;
    return pipelines.find((p) => p.id === selectedProcess.pipelineId);
  }, [selectedProcess, pipelines]);

  const activeStages = useMemo(() => {
    if (!activePipeline) return [];
    // Sort stages by displayOrder
    return [...(activePipeline.stages || [])].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [activePipeline]);

  // Beklemede ve reddedildi normal ilerleme sırasının parçası değildir;
  // aday bu özel durumlara akışın herhangi bir noktasından taşınabilir.
  const progressStages = useMemo(
    () => activeStages.filter((stage) => stage.stageType !== "ON_HOLD" && stage.stageType !== "REJECTED"),
    [activeStages]
  );

  const currentStage = useMemo(() => {
    if (!selectedProcess) return null;
    return activeStages.find((s) => s.id === selectedProcess.currentStageId) || {
      id: selectedProcess.currentStageId,
      name: selectedProcess.currentStageName,
      stageType: "ACTIVE",
    };
  }, [selectedProcess, activeStages]);

  const currentStageIndex = useMemo(() => {
    if (!currentStage) return -1;
    return progressStages.findIndex((s) => s.id === currentStage.id);
  }, [currentStage, progressStages]);

  // Stage progress helper
  const getStageStatus = (stageId: number) => {
    if (!currentStage) return "future";
    const currentOrder = progressStages.find(s => s.id === currentStage.id)?.displayOrder || 0;
    const thisOrder = progressStages.find(s => s.id === stageId)?.displayOrder || 0;

    if (thisOrder < currentOrder) return "completed";
    if (thisOrder === currentOrder) return "current";
    return "future";
  };

  const stageStatusColor = (status: string) => {
    if (status === "completed") return "bg-primary text-white";
    if (status === "current") return "bg-primary/20 text-primary ring-2 ring-primary/40";
    return "bg-muted text-muted-foreground";
  };

  const handleAdvanceStage = () => {
    if (!selectedProcess || currentStageIndex === -1 || currentStageIndex >= progressStages.length - 1) return;
    const nextStage = progressStages[currentStageIndex + 1];
    setPendingStageChange({
      processId: selectedProcess.id,
      fromStage: selectedProcess.currentStageName,
      applicationLabel: selectedProcess.positionTitle,
      targetStageId: nextStage.id,
      targetStageName: nextStage.name,
      successMessage: "Aday bir sonraki aşamaya ilerletildi: " + nextStage.name,
      errorPrefix: "Aday ilerletilemedi: ",
    });
  };

  const requestSpecialStage = (stageType: "ON_HOLD" | "REJECTED") => {
    if (!selectedProcess) return;
    const targetStage = activeStages.find((stage) => stage.stageType === stageType);
    if (!targetStage) {
      toast.error(stageType === "ON_HOLD" ? "Bu pipeline için bekleme aşaması bulunamadı." : "Bu pipeline için red aşaması bulunamadı.");
      return;
    }
    if (targetStage.id === selectedProcess.currentStageId) return;
    setPendingStageChange({
      processId: selectedProcess.id,
      fromStage: selectedProcess.currentStageName,
      applicationLabel: selectedProcess.positionTitle,
      targetStageId: targetStage.id,
      targetStageName: targetStage.name,
      successMessage: stageType === "ON_HOLD" ? "Aday beklemeye alındı." : "Aday reddedildi.",
      errorPrefix: stageType === "ON_HOLD" ? "Aday beklemeye alınamadı: " : "Aday reddedilemedi: ",
    });
  };

  const handleResumeCandidate = () => {
    if (!selectedProcess) return;
    const previousActiveStage = [...stageHistory]
      .reverse()
      .map((history) => progressStages.find((stage) => stage.id === history.toStageId))
      .find(Boolean) || progressStages[0];
    if (!previousActiveStage) return;
    setPendingStageChange({
      processId: selectedProcess.id,
      fromStage: selectedProcess.currentStageName,
      applicationLabel: selectedProcess.positionTitle,
      targetStageId: previousActiveStage.id,
      targetStageName: previousActiveStage.name,
      successMessage: `Aday sürece döndürüldü: ${previousActiveStage.name}`,
      errorPrefix: "Aday sürece döndürülemedi: ",
    });
  };

  const handleRejectCandidate = () => {
    requestSpecialStage("REJECTED");
  };

  const confirmStageChange = async (note?: string) => {
    if (!pendingStageChange) return;
    setActionLoading(true);
    try {
      await candidateProcessApi.changeStage(pendingStageChange.processId, {
        stageId: pendingStageChange.targetStageId,
        reason: note,
      });
      toast.success(pendingStageChange.successMessage);
      setPendingStageChange(null);
      setHistoryRefreshKey((key) => key + 1);
      loadCandidateData();
    } catch (err: any) {
      toast.error(pendingStageChange.errorPrefix + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
    } finally {
      setActionLoading(false);
    }
  };

  const openProfileEditor = () => {
    if (!candidate) return;
    setProfileForm({
      firstName: candidate.firstName || "",
      lastName: candidate.lastName || "",
      email: candidate.email || "",
      phone: candidate.phone || "",
      city: candidate.city || "",
      linkedinUrl: candidate.linkedinUrl || "",
      currentCompany: candidate.currentCompany || "",
      currentJobTitle: candidate.currentJobTitle || "",
      noticePeriodDays: candidate.noticePeriodDays == null ? "" : String(candidate.noticePeriodDays),
    });
    setProfileCvFile(null);
    setShowEditProfile(true);
  };

  const selectProfileCv = (file?: File) => {
    if (!file) return setProfileCvFile(null);
    if (!isAllowedFile(file, applicationContract.candidateCv)) {
      toast.error(`CV yalnızca ${applicationContract.candidateCv.allowedExtensions.join(", ")} formatında yüklenebilir.`);
      return;
    }
    if (file.size > applicationContract.candidateCv.maxFileSizeBytes) {
      toast.error(`CV dosyası en fazla ${formatFileSize(applicationContract.candidateCv.maxFileSizeBytes)} olabilir.`);
      return;
    }
    setProfileCvFile(file);
  };

  const deleteCandidateCv = async () => {
    if (!candidate || !candidateCv || !window.confirm("Adayın CV dosyası silinsin mi?")) return;
    try {
      await candidateApi.deleteCv(candidate.id);
      setCandidateCv(null);
      toast.success("CV silindi.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "CV silinemedi.");
    }
  };

  const saveProfile = async () => {
    if (!candidate || !profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      toast.error("Ad ve soyad zorunludur.");
      return;
    }
    setProfileSaving(true);
    try {
      await candidateApi.update(candidate.id, {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim() || null,
        phone: profileForm.phone.trim() || null,
        city: profileForm.city.trim() || null,
        linkedinUrl: profileForm.linkedinUrl.trim() || null,
        currentCompany: profileForm.currentCompany.trim() || null,
        currentJobTitle: profileForm.currentJobTitle.trim() || null,
        noticePeriodDays: profileForm.noticePeriodDays === "" ? null : Number(profileForm.noticePeriodDays),
      });
      if (profileCvFile) await candidateApi.uploadCv(candidate.id, profileCvFile);
      toast.success("Aday bilgileri güncellendi.");
      setShowEditProfile(false);
      await loadCandidateData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Aday bilgileri güncellenemedi.");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveCompensation = async () => {
    if (!canUpdateCompensation) {
      toast.error("Maaş ve teklif bilgilerini güncelleme yetkiniz bulunmuyor.");
      return;
    }
    if (!selectedProcess) return;
    const toNumber = (value: string) => value.trim() === "" ? null : Number(value);
    const values = [compensationForm.currentSalary, compensationForm.expectedSalary, compensationForm.offeredSalary];
    if (values.some((value) => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
      toast.error("Maaş alanlarına sıfır veya pozitif bir tutar girin.");
      return;
    }
    setCompensationSaving(true);
    try {
      await candidateProcessApi.updateCompensation(selectedProcess.id, {
        currentSalary: toNumber(compensationForm.currentSalary),
        expectedSalary: toNumber(compensationForm.expectedSalary),
        offeredSalary: toNumber(compensationForm.offeredSalary),
        salaryCurrency: compensationForm.salaryCurrency || null,
      });
      toast.success(`${selectedProcess.positionTitle} için maaş bilgileri güncellendi.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Maaş bilgileri güncellenemedi.");
    } finally {
      setCompensationSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Aday bulunamadı.</p>
        <Link href="/adaylar" className="text-primary hover:underline text-sm">
          Adaylara dön
        </Link>
      </div>
    );
  }

  const stageColor =
    currentStage?.stageType === "HIRED"
      ? "text-primary bg-primary/10 border-primary/20"
      : currentStage?.stageType === "REJECTED"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : currentStage?.stageType === "ON_HOLD"
      ? "text-chart-3 bg-chart-3/10 border-chart-3/20"
      : "text-chart-2 bg-chart-2/10 border-chart-2/20";

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <CandidateSidebar
        candidate={candidate}
        processes={processes}
        pipelines={pipelines}
        selectedProcess={selectedProcess}
        currentStage={currentStage}
        stageColor={stageColor}
        actionLoading={actionLoading}
        onSelectProcess={setSelectedProcessId}
        onStageRequest={setPendingStageChange}
      />

      {/* RIGHT PANEL - Tab view area */}
      <div className="flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-6 bg-card sticky top-0 z-10">
          {[
            { key: "profil" as const, label: "Profil", icon: FileText },
            { key: "surec" as const, label: "Süreç İlerleyişi", icon: CheckCircle2 },
            { key: "notlar" as const, label: "Notlar", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "profil" && <CandidateProfile
            candidate={candidate}
            cv={candidateCv}
            canEdit={canUpdateCandidate}
            onEdit={openProfileEditor}
            onDownloadCv={() => candidateCv && candidateApi.downloadCv(candidate.id, candidateCv.fileName)}
          />}

          {activeTab === "surec" && (
            <div className="space-y-6 animate-fade-in">
              {/* Stage progression timeline */}
              <div className="glass rounded-xl p-6">
                <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">İşe Alım Süreci</h3>
                    <p className="mt-1 text-xs text-muted-foreground">İlerletme ve reddetme işlemleri seçili başvuruya uygulanır.</p>
                  </div>
                  {processes.length > 0 && (
                    <div className="w-full sm:w-72">
                      <label htmlFor="active-application" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Aktif başvuru
                      </label>
                      <select
                        id="active-application"
                        value={selectedProcess?.id || ""}
                        onChange={(event) => setSelectedProcessId(Number(event.target.value))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      >
                        {processes.map((process) => (
                          <option key={process.id} value={process.id}>
                            {process.positionTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {progressStages.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Bu aday için aktif bir süreç bulunmuyor.</p>
                ) : (
                  <>
                    <div
                      className="hidden items-start pb-4 lg:grid"
                      style={{ gridTemplateColumns: `repeat(${progressStages.length}, minmax(0, 1fr))` }}
                    >
                      {progressStages.map((stage, i) => {
                        const status = getStageStatus(stage.id);
                        return (
                          <div key={stage.id} className="relative flex min-w-0 flex-col items-center px-1">
                            {i < progressStages.length - 1 && (
                              <div
                                className={cn(
                                  "absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-[1.125rem] h-0.5 transition-colors",
                                  status === "completed" ? "bg-primary" : "bg-border"
                                )}
                              />
                            )}
                            <div className="relative z-[1] flex min-w-0 flex-col items-center gap-2">
                              <div
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 xl:h-10 xl:w-10",
                                  stageStatusColor(status)
                                )}
                              >
                                {status === "completed" ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  i + 1
                                )}
                              </div>
                              <span
                                className={cn(
                                  "line-clamp-2 min-h-7 w-full text-center text-[10px] font-medium leading-tight xl:text-[11px]",
                                  status === "current" ? "text-primary font-semibold" : "text-muted-foreground"
                                )}
                              >
                                {stage.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2 pb-3 lg:hidden">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-primary">{currentStage?.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {Math.max(currentStageIndex + 1, 1)} / {progressStages.length}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(((currentStageIndex + 1) / progressStages.length) * 100, 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stage actions */}
                    {canChangeCandidateStage && selectedProcess && (
                      <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border sm:flex-row sm:items-center">
                        <div>
                          <p className="text-xs font-medium text-primary">{selectedProcess?.positionTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {currentStage?.stageType === "ON_HOLD" || currentStage?.stageType === "REJECTED" ? (
                              <>Özel durum: <span className="font-semibold text-foreground">{currentStage.name}</span></>
                            ) : currentStageIndex < progressStages.length - 1 ? (
                              <>Sonraki aşama: <span className="font-semibold text-foreground">{progressStages[currentStageIndex + 1]?.name}</span></>
                            ) : (
                              <span className="font-semibold text-foreground">Normal akış tamamlandı</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
                          {(currentStage?.stageType === "ON_HOLD" || currentStage?.stageType === "REJECTED") ? (
                            <button onClick={handleResumeCandidate} disabled={actionLoading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-55">
                              <ArrowRight className="h-4 w-4" /> Sürece Döndür
                            </button>
                          ) : (
                            <>
                              {currentStageIndex >= 0 && currentStageIndex < progressStages.length - 1 && (
                                <button onClick={handleAdvanceStage} disabled={actionLoading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-55">
                                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} İlerlet
                                </button>
                              )}
                              <button onClick={() => requestSpecialStage("ON_HOLD")} disabled={actionLoading} className="flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-55">
                                <PauseCircle className="h-4 w-4" /> Beklemeye Al
                              </button>
                              <button onClick={handleRejectCandidate} disabled={actionLoading} className="flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-55">
                                <XCircle className="h-4 w-4" /> Reddet
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* All processes table */}
              {(compensationAllowed || compensationLoading) && selectedProcess && (
                <div className="glass rounded-xl p-5">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-foreground">Maaş ve Teklif Bilgileri</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Maaş bilgileri adayın seçili başvurusuna özel kaydedilir.</p>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{selectedProcess.positionTitle}</span>
                  </div>
                  {!canUpdateCompensation && !compensationLoading && (
                    <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <LockKeyhole className="h-4 w-4 shrink-0" />
                      Bu bilgileri görüntüleyebilirsiniz ancak güncelleme yetkiniz bulunmuyor.
                    </div>
                  )}
                  {compensationLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MoneyField label="Mevcut maaş" value={compensationForm.currentSalary} disabled={!canUpdateCompensation} onChange={(value) => setCompensationForm((form) => ({ ...form, currentSalary: value }))} />
                      <MoneyField label="Beklenen maaş" value={compensationForm.expectedSalary} disabled={!canUpdateCompensation} onChange={(value) => setCompensationForm((form) => ({ ...form, expectedSalary: value }))} />
                      <MoneyField label="Teklif edilen" value={compensationForm.offeredSalary} disabled={!canUpdateCompensation} onChange={(value) => setCompensationForm((form) => ({ ...form, offeredSalary: value }))} />
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Para birimi</label>
                        <select disabled={!canUpdateCompensation} value={compensationForm.salaryCurrency} onChange={(event) => setCompensationForm((form) => ({ ...form, salaryCurrency: event.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted/40 disabled:text-foreground disabled:opacity-100">
                          {applicationContract.salaryCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                        </select>
                      </div>
                      <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                        {canUpdateCompensation && <button type="button" onClick={saveCompensation} disabled={compensationSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                          {compensationSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Maaş bilgilerini kaydet
                        </button>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {processes.length > 0 && (
              <div className="glass rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Pozisyon</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Pipeline</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Mevcut Aşama</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processes.map((p) => {
                        const isHired = p.currentStageName.toLowerCase().includes("alındı");
                        const isRejected = p.currentStageName.toLowerCase().includes("red");
                        
                        return (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                            <td className="px-5 py-3 text-sm text-foreground">{p.positionTitle || "—"}</td>
                            <td className="px-5 py-3 text-sm text-muted-foreground">{p.pipelineName || "—"}</td>
                            <td className="px-5 py-3 text-sm text-foreground">{p.currentStageName || "—"}</td>
                            <td className="px-5 py-3">
                              <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                                isHired ? "bg-primary/10 text-primary border-primary/20" :
                                isRejected ? "bg-destructive/10 text-destructive border-destructive/20" :
                                "bg-chart-2/10 text-chart-2 border-chart-2/20"
                              )}>
                                {isHired ? "İşe Alındı" : isRejected ? "Reddedildi" : "Aktif"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "notlar" && (
            <div className="space-y-4 animate-fade-in">
              <div className="glass rounded-xl p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Süreç Notları</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aşama değişikliklerinde eklenen notlar başvuruya özel olarak saklanır.
                    </p>
                  </div>
                  {processes.length > 0 && (
                    <div className="w-full sm:w-72">
                      <label htmlFor="notes-application" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Başvuru
                      </label>
                      <select
                        id="notes-application"
                        value={selectedProcess?.id || ""}
                        onChange={(event) => setSelectedProcessId(Number(event.target.value))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                      >
                        {processes.map((process) => (
                          <option key={process.id} value={process.id}>{process.positionTitle}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : stageHistory.length > 0 ? (
                  <div className="space-y-0">
                    {stageHistory.map((history, index) => (
                      <div key={history.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {index < stageHistory.length - 1 && (
                          <div className="absolute bottom-0 left-[15px] top-8 w-px bg-border" />
                        )}
                        <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/15 p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              {history.fromStageName && (
                                <>
                                  <span className="text-muted-foreground">{history.fromStageName}</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </>
                              )}
                              <span className="font-semibold text-foreground">{history.toStageName}</span>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(history.changedAt).toLocaleString("tr-TR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          {history.reason ? (
                            <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-sm leading-relaxed text-blue-900">
                              {history.reason}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs italic text-muted-foreground">Bu geçişte not eklenmemiş.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Henüz süreç notu bulunmuyor.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Aşamayı değiştirirken eklediğiniz notlar burada görünür.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <EditCandidateProfileDialog
        open={showEditProfile && canUpdateCandidate}
        form={profileForm}
        cv={candidateCv}
        cvFile={profileCvFile}
        saving={profileSaving}
        cvContract={applicationContract.candidateCv}
        onOpenChange={setShowEditProfile}
        onFormChange={setProfileForm}
        onCvSelection={selectProfileCv}
        onCvDownload={() => candidateCv && candidateApi.downloadCv(candidate.id, candidateCv.fileName)}
        onCvDelete={deleteCandidateCv}
        onSave={saveProfile}
      />
      {canChangeCandidateStage && <StageChangeDialog
        open={Boolean(pendingStageChange)}
        candidateName={candidate.fullName}
        applicationLabel={pendingStageChange?.applicationLabel}
        fromStage={pendingStageChange?.fromStage}
        toStage={pendingStageChange?.targetStageName}
        loading={actionLoading}
        onOpenChange={(open) => !open && setPendingStageChange(null)}
        onConfirm={confirmStageChange}
      />}
    </div>
  );
}

function MoneyField({ label, value, disabled = false, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input disabled={disabled} type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} placeholder="0,00" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted/40 disabled:text-foreground disabled:opacity-100" />
    </div>
  );
}

function InfoTableRow({ label, value, type }: { label: string; value: string; type?: "email" | "phone" | "location" | "link" }) {
  const iconMap: Record<string, any> = {
    email: Mail,
    phone: Phone,
    location: MapPin,
    link: Globe,
  };
  const Icon = type ? iconMap[type] : null;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
      <td className="px-5 py-2.5 text-sm font-medium text-muted-foreground w-36 shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </div>
      </td>
      <td className="px-5 py-2.5">
        {type === "link" && value !== "—" ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
            <span className="truncate max-w-[300px]">{value}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : type === "email" ? (
          <a href={`mailto:${value}`} className="text-sm text-foreground hover:text-primary transition-colors truncate block max-w-[300px]">
            {value}
          </a>
        ) : type === "phone" ? (
          <a href={`tel:${value}`} className="text-sm text-foreground hover:text-primary transition-colors">
            {value}
          </a>
        ) : (
          <span className="text-sm text-foreground">{value}</span>
        )}
      </td>
    </tr>
  );
}
