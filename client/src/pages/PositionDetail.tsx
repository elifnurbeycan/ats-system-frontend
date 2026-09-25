import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { positionApi, pipelineApi, candidateProcessApi } from "@/lib/api";
import { toast } from "sonner";

export default function PositionDetail() {
  const { id } = useParams();
  const positionId = parseInt(id || "0");

  const [position, setPosition] = useState<any | null>(null);
  const [board, setBoard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPositionData = async () => {
    setLoading(true);
    try {
      // 1. Fetch position details
      const posData = await positionApi.getById(positionId);
      setPosition(posData);

      // 2. Fetch all pipelines to find default pipeline
      const pipelines = await pipelineApi.getAll();
      const activePipeline = pipelines.find((p) => p.defaultPipeline) || pipelines[0];

      if (activePipeline) {
        // 3. Fetch board for this pipeline and position
        const boardData = await candidateProcessApi.getBoard(activePipeline.id, positionId);
        setBoard(boardData);
      }
    } catch (err: any) {
      toast.error("Pozisyon detayları yüklenemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (positionId) {
      loadPositionData();
    }
  }, [positionId]);

  const totalCandidates = useMemo(() => {
    if (!board || !board.stages) return 0;
    return board.stages.reduce((acc: number, stage: any) => acc + (stage.candidates?.length || 0), 0);
  }, [board]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Pozisyon bulunamadı.</p>
        <Link href="/pozisyonlar" className="text-primary hover:underline text-sm">
          Pozisyonlara dön
        </Link>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <Link
        href="/pozisyonlar"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-slide-up"
      >
        <ArrowLeft className="h-4 w-4" />
        Pozisyonlara dön
      </Link>

      {/* Header */}
      <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs text-muted-foreground">
                {position.code}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-medium",
                  statusColors[position.status] || "bg-muted text-muted-foreground border-border"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabels[position.status] || position.status}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {position.title}
            </h1>
            {position.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
                {position.description}
              </p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <MetaItem
            icon={Building2}
            label="Departman"
            value={position.departmentName || "—"}
          />
          <MetaItem
            icon={Users}
            label="Toplam aday"
            value={String(totalCandidates)}
          />
          <MetaItem
            icon={CheckCircle2}
            label="Boş Kontenjan"
            value={String(position.vacancyCount)}
          />
          <MetaItem
            icon={Calendar}
            label="Açılış Tarihi"
            value={
              position.openedAt
                ? new Date(position.openedAt).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">
          Süreç Görünümü {board?.pipelineName ? `(${board.pipelineName})` : ""}
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {!board?.stages || board.stages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Bu pozisyon için atanmış aktif bir süreç aşaması bulunmuyor.</p>
          ) : (
            board.stages.map((stage: any, i: number) => {
              // Only display active types or non-terminated stages in Kanban if desired, but typically we display all pipeline stages
              const candidates = stage.candidates || [];
              return (
                <div
                  key={stage.id}
                  className="glass rounded-2xl p-4 min-w-[280px] w-[280px] shrink-0"
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-semibold">
                        {stage.displayOrder}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                        {stage.name}
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-0.5">
                      {candidates.length}
                    </span>
                  </div>

                  {/* Candidates List */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {candidates.map((c: any) => {
                      const initials = c.fullName
                        ? c.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                        : "??";
                      return (
                        <Link
                          key={c.candidateProcessId}
                          href={`/adaylar/${c.candidateId}`}
                          className="block rounded-xl bg-card border border-border p-3 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/5 text-primary font-display font-semibold text-xs">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {c.fullName}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {candidates.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Bu aşamada aday yok
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
