import { Download, FileText, Loader2, Save, Trash2, Upload } from "lucide-react";
import type { CandidateCv } from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatFileSize, type ApplicationContract } from "@/lib/api/application-contract";

export interface CandidateProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  linkedinUrl: string;
  currentCompany: string;
  currentJobTitle: string;
  noticePeriodDays: string;
}

interface Props {
  open: boolean; form: CandidateProfileForm; cv: CandidateCv | null; cvFile: File | null; saving: boolean;
  cvContract: ApplicationContract["candidateCv"];
  onOpenChange: (open: boolean) => void; onFormChange: (form: CandidateProfileForm) => void;
  onCvSelection: (file?: File) => void; onCvDownload: () => void; onCvDelete: () => void; onSave: () => void;
}

export function EditCandidateProfileDialog({ open, form, cv, cvFile, cvContract, saving, onOpenChange, onFormChange, onCvSelection, onCvDownload, onCvDelete, onSave }: Props) {
  const field = (name: keyof CandidateProfileForm, value: string) => onFormChange({ ...form, [name]: value });
  return <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Aday bilgilerini düzenle</DialogTitle></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2">
    <ProfileField label="Ad *" value={form.firstName} onChange={(v) => field("firstName", v)} /><ProfileField label="Soyad *" value={form.lastName} onChange={(v) => field("lastName", v)} />
    <ProfileField label="E-posta" type="email" value={form.email} onChange={(v) => field("email", v)} /><ProfileField label="Telefon" value={form.phone} onChange={(v) => field("phone", v)} />
    <ProfileField label="Şehir" value={form.city} onChange={(v) => field("city", v)} /><ProfileField label="LinkedIn" value={form.linkedinUrl} onChange={(v) => field("linkedinUrl", v)} />
    <ProfileField label="Mevcut şirket" value={form.currentCompany} onChange={(v) => field("currentCompany", v)} /><ProfileField label="Mevcut pozisyon" value={form.currentJobTitle} onChange={(v) => field("currentJobTitle", v)} />
    <ProfileField label="İhbar süresi (gün)" type="number" min="0" value={form.noticePeriodDays} onChange={(v) => field("noticePeriodDays", v)} />
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-2"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">CV</p><p className="text-xs text-muted-foreground">En fazla {formatFileSize(cvContract.maxFileSizeBytes)}; {cvContract.allowedExtensions.join(", ")} yükleyin.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"><Upload className="h-4 w-4" />{cv || cvFile ? "Değiştir" : "Dosya seç"}<input type="file" accept={[...cvContract.allowedContentTypes, ...cvContract.allowedExtensions].join(",")} className="sr-only" onChange={(e) => onCvSelection(e.target.files?.[0])} /></label></div>
      {cvFile ? <CvRow name={cvFile.name} suffix="Yeni dosya" /> : cv ? <CvRow name={cv.fileName} onDownload={onCvDownload} onDelete={onCvDelete} /> : <p className="text-sm text-muted-foreground">Bu adaya henüz CV yüklenmemiş.</p>}
    </div></div><DialogFooter><button type="button" disabled={saving} onClick={() => onOpenChange(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Vazgeç</button><button type="button" disabled={saving} onClick={onSave} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Kaydet</button></DialogFooter></DialogContent></Dialog>;
}

function ProfileField({ label, value, onChange, type = "text", min }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string }) { return <div><label className="mb-1.5 block text-sm font-medium">{label}</label><input type={type} min={min} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" /></div>; }
function CvRow({ name, suffix, onDownload, onDelete }: { name: string; suffix?: string; onDownload?: () => void; onDelete?: () => void }) { return <div className="flex items-center gap-2 rounded-md bg-background p-2 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate">{name}</span>{suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}{onDownload && <button type="button" title="CV'yi indir" onClick={onDownload} className="rounded-md p-2 hover:bg-muted"><Download className="h-4 w-4" /></button>}{onDelete && <button type="button" title="CV'yi sil" onClick={onDelete} className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>}</div>; }
