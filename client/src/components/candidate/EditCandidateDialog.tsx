import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CandidateCv } from "@/lib/api";
import { formatFileSize, type ApplicationContract } from "@/lib/api/application-contract";

export type CandidateEditForm = { id: number | null; firstName: string; lastName: string; linkedinUrl: string; email: string;
  phone: string; city: string; currentCompany: string; currentJobTitle: string; noticePeriodDays: string | number };
type Props = { open: boolean; form: CandidateEditForm; cv: CandidateCv | null; cvFile: File | null; cvLoading: boolean;
  cvContract: ApplicationContract["candidateCv"];
  submitting: boolean; onOpenChange: (open: boolean) => void; onFormChange: (form: CandidateEditForm) => void;
  onCvSelection: (file?: File) => void; onCvDownload: () => void; onCvDelete: () => void; onSave: () => void };

export function EditCandidateDialog({ open, form, cv, cvFile, cvLoading, cvContract, submitting, onOpenChange, onFormChange,
  onCvSelection, onCvDownload, onCvDelete, onSave }: Props) {
  const field = (key: keyof CandidateEditForm, value: string | number) => onFormChange({ ...form, [key]: value });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[540px]">
    <DialogHeader><DialogTitle>Aday bilgilerini düzenle</DialogTitle><DialogDescription>Adayın profil bilgilerini güncelleyin.</DialogDescription></DialogHeader>
    <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto py-4 pr-1">
      <Field label="Adı *" value={form.firstName} onChange={v=>field("firstName",v)} /><Field label="Soyadı *" value={form.lastName} onChange={v=>field("lastName",v)} />
      <Field wide label="LinkedIn profil adresi" value={form.linkedinUrl} onChange={v=>field("linkedinUrl",v)} placeholder="https://linkedin.com/in/username" />
      <Field wide label="E-posta" type="email" value={form.email} onChange={v=>field("email",v)} />
      <Field label="Telefon" value={form.phone} onChange={v=>field("phone",v)} /><Field label="Şehir" value={form.city} onChange={v=>field("city",v)} />
      <Field label="Mevcut şirket" value={form.currentCompany} onChange={v=>field("currentCompany",v)} /><Field label="Mevcut unvan" value={form.currentJobTitle} onChange={v=>field("currentJobTitle",v)} />
      <Field wide label="İhbar süresi (gün)" type="number" value={String(form.noticePeriodDays)} onChange={v=>field("noticePeriodDays",v)} />
      <div className="col-span-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3"><div><label className="text-sm font-medium">CV</label><p className="text-xs text-muted-foreground">En fazla {formatFileSize(cvContract.maxFileSizeBytes)}; {cvContract.allowedExtensions.join(", ")} yükleyin.</p></div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"><Upload className="h-4 w-4" />{cv || cvFile ? "Değiştir" : "PDF seç"}
            <input type="file" accept={[...cvContract.allowedContentTypes, ...cvContract.allowedExtensions].join(",")} className="sr-only" onChange={e=>onCvSelection(e.target.files?.[0])} /></label></div>
        {cvLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> CV kontrol ediliyor</p>
          : cvFile ? <FileLine name={cvFile.name} suffix="Yeni dosya" />
          : cv ? <FileLine name={cv.fileName} actions={<><Button type="button" variant="ghost" size="icon" onClick={onCvDownload}><Download className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={onCvDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button></>} />
          : <p className="text-sm text-muted-foreground">Bu adaya henüz CV yüklenmemiş.</p>}
      </div>
    </div>
    <DialogFooter><Button variant="outline" onClick={()=>onOpenChange(false)}>İptal</Button><Button onClick={onSave} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Değişiklikleri kaydet</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function Field({ label, value, onChange, type="text", wide=false, placeholder }: { label:string; value:string; onChange:(v:string)=>void; type?:string; wide?:boolean; placeholder?:string }) {
  return <div className={`space-y-1.5 ${wide ? "col-span-2" : ""}`}><label className="text-sm font-medium">{label}</label><Input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} /></div>;
}
function FileLine({ name, suffix, actions }: { name:string; suffix?:string; actions?:React.ReactNode }) { return <div className="flex items-center gap-2 rounded-md bg-background p-2 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate">{name}</span>{suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}{actions}</div>; }
