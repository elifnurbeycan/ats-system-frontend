import { Building2, Download, FileText, Pencil } from "lucide-react";
import type { Candidate, CandidateCv } from "@/lib/api";

type Props = {
  candidate: Candidate;
  cv: CandidateCv | null;
  canEdit: boolean;
  onEdit: () => void;
  onDownloadCv: () => void;
};

export function CandidateProfile({ candidate, cv, canEdit, onEdit, onDownloadCv }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Aday Bilgileri</h2>
          <p className="mt-1 text-xs text-muted-foreground">İletişim ve mevcut çalışma bilgilerini yönetin.</p>
        </div>
        {canEdit && <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
          <Pencil className="h-4 w-4" /> Bilgileri düzenle
        </button>}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full"><tbody>
          <InfoRow label="Ad Soyad" value={`${candidate.firstName} ${candidate.lastName}`} />
          <InfoRow label="E-posta" value={candidate.email || "—"} type="email" />
          <InfoRow label="Telefon" value={candidate.phone || "—"} type="phone" />
          <InfoRow label="Şehir" value={candidate.city || "—"} />
          <InfoRow label="Mevcut Şirket" value={candidate.currentCompany || "—"} />
          <InfoRow label="Mevcut Pozisyon" value={candidate.currentJobTitle || "—"} />
          <InfoRow label="İhbar Süresi" value={candidate.noticePeriodDays ? `${candidate.noticePeriodDays} gün` : "—"} />
          <InfoRow label="LinkedIn" value={candidate.linkedinUrl || "—"} type="link" />
        </tbody></table>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
            <div className="min-w-0"><h3 className="text-sm font-semibold text-foreground">Özgeçmiş</h3>
              <p className="truncate text-xs text-muted-foreground">{cv?.fileName || "Bu adaya henüz CV yüklenmemiş."}</p></div>
          </div>
          {cv && <button type="button" onClick={onDownloadCv} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> CV'yi indir
          </button>}
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h3 className="font-display font-semibold text-foreground mb-3">Deneyim</h3>
        {candidate.currentCompany ? <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground mt-0.5"><Building2 className="h-4 w-4" /></div>
          <div><p className="text-sm font-medium text-foreground">{candidate.currentJobTitle || "Ünvan Yok"}</p><p className="text-xs text-muted-foreground">{candidate.currentCompany}</p></div>
        </div> : <p className="text-sm text-muted-foreground">Kayıtlı iş deneyimi bulunmuyor.</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, type }: { label: string; value: string; type?: "email" | "phone" | "link" }) {
  let content = <span className="text-sm text-foreground break-all">{value}</span>;
  if (value !== "—" && type === "email") content = <a className="text-sm text-primary hover:underline" href={`mailto:${value}`}>{value}</a>;
  if (value !== "—" && type === "phone") content = <a className="text-sm text-primary hover:underline" href={`tel:${value}`}>{value}</a>;
  if (value !== "—" && type === "link") content = <a className="text-sm text-primary hover:underline" href={value} target="_blank" rel="noreferrer">{value}</a>;
  return <tr className="border-b border-border last:border-0"><th className="w-36 px-5 py-3 text-left text-sm font-medium text-muted-foreground">{label}</th><td className="px-5 py-3">{content}</td></tr>;
}
