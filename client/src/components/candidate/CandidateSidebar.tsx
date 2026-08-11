import { ArrowLeft, Briefcase, Building2, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { Candidate, CandidateProcessSummary, Pipeline } from "@/lib/api";
import { LinkedInLink } from "./LinkedInLink";

type StageRequest = { processId: number; fromStage: string; applicationLabel: string; targetStageId: number;
  targetStageName: string; successMessage: string; errorPrefix: string };
type Props = { candidate: Candidate; processes: CandidateProcessSummary[]; pipelines: Pipeline[];
  selectedProcess: CandidateProcessSummary | undefined; currentStage?: { name: string }; stageColor: string;
  actionLoading: boolean; onSelectProcess: (id: number) => void; onStageRequest: (request: StageRequest) => void };

export function CandidateSidebar({ candidate, processes, pipelines, selectedProcess, currentStage, stageColor,
  actionLoading, onSelectProcess, onStageRequest }: Props) {
  return <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto">
    <div className="p-4 border-b border-border">
      <Link href="/adaylar" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Adaylara dön
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">{candidate.firstName?.[0]}{candidate.lastName?.[0]}</div>
        <div className="min-w-0"><h2 className="truncate font-display text-base font-bold text-foreground">{candidate.fullName}</h2>
          <p className="truncate text-xs text-muted-foreground">{candidate.currentJobTitle || "İş Unvanı Yok"}</p></div>
      </div>
      {currentStage && <div className="mt-3 space-y-1">{processes.length > 1 && <p className="text-[10px] font-medium text-muted-foreground">{selectedProcess?.positionTitle}</p>}
        <span className={cn("inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium", stageColor)}>{currentStage.name}</span></div>}
    </div>

    <section className="space-y-2.5 border-b border-border p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">İletişim</h3>
      {candidate.email ? <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-sm hover:text-primary"><Mail className="h-3.5 w-3.5" /><span className="truncate">{candidate.email}</span></a>
        : <div className="flex items-center gap-2 text-sm text-muted-foreground/50"><Mail className="h-3.5 w-3.5" />E-posta yok</div>}
      {candidate.phone && <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 text-sm hover:text-primary"><Phone className="h-3.5 w-3.5" />{candidate.phone}</a>}
      {candidate.city && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{candidate.city}</div>}
      <LinkedInLink url={candidate.linkedinUrl} showLabel className="w-fit" />
    </section>

    <section className="space-y-2.5 border-b border-border p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mevcut Pozisyon</h3>
      <div className="flex items-center gap-2 text-sm"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" />{candidate.currentJobTitle || "—"}</div>
      <div className="flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{candidate.currentCompany || "—"}</div>
      <div className="flex items-center gap-2 text-sm"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{candidate.noticePeriodDays ? `${candidate.noticePeriodDays} gün ihbar` : "—"}</div>
    </section>

    <section className="space-y-2.5 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Başvurulan Pozisyonlar</h3>
      <div className="space-y-2">{processes.map((process) => {
        const stages = [...(pipelines.find((item) => item.id === process.pipelineId)?.stages || [])].sort((a,b) => a.displayOrder-b.displayOrder);
        return <div key={process.id} onClick={() => onSelectProcess(process.id)} className={cn("cursor-pointer rounded-lg border p-3",
          selectedProcess?.id === process.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-muted/20 hover:border-primary/40")}>
          <div className="flex justify-between gap-2"><p className="text-sm font-medium">{process.positionTitle || "—"}</p>{selectedProcess?.id === process.id && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">Seçili</span>}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{process.pipelineName}</p>
          {stages.length > 0 && <select value={process.currentStageId} disabled={actionLoading} onClick={(e) => e.stopPropagation()}
            onChange={(event) => { const id=Number(event.target.value); const stage=stages.find(x=>x.id===id); if(!stage||id===process.currentStageId)return;
              onSelectProcess(process.id); onStageRequest({ processId: process.id, fromStage: process.currentStageName,
                applicationLabel: process.positionTitle, targetStageId:id, targetStageName:stage.name,
                successMessage:`${process.positionTitle} süreci ${stage.name} aşamasına taşındı.`, errorPrefix:"Süreç güncellenemedi: " }); }}
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium">
            {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select>}
        </div>;
      })}</div>
    </section>
  </aside>;
}
