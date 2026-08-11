import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CandidateCreateForm {
  firstName: string;
  lastName: string;
  linkedinUrl: string;
  departmentId: string;
  positionId: string;
  pipelineId: string;
}

interface CreateCandidateDialogProps {
  open: boolean;
  form: CandidateCreateForm;
  departments: Array<{ id: number; name: string }>;
  positions: Array<{ id: number; title: string }>;
  pipelines: Array<{ id: number; name: string }>;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: CandidateCreateForm) => void;
  onSave: () => void;
}

export function CreateCandidateDialog({ open, form, departments, positions, pipelines, submitting, onOpenChange, onFormChange, onSave }: CreateCandidateDialogProps) {
  const update = (values: Partial<CandidateCreateForm>) => onFormChange({ ...form, ...values });
  const updateLinkedIn = (linkedinUrl: string) => {
    const values: Partial<CandidateCreateForm> = { linkedinUrl };
    if (!form.firstName.trim() && !form.lastName.trim()) {
      const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
      const slug = match ? decodeURIComponent(match[1]).replace(/-[a-f0-9]{6,}$/i, "") : "";
      const words = slug.split(/[-_]+/).filter(Boolean).map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1));
      if (words.length >= 2) {
        values.firstName = words.slice(0, -1).join(" ");
        values.lastName = words.at(-1);
      }
    }
    update(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Yeni Aday Ekle</DialogTitle>
          <DialogDescription>Kişiyi iletişim havuzuna ekleyin. Olumlu dönüş alındığında işe alım süreci başlayacaktır.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adı *" value={form.firstName} placeholder="Ahmet" onChange={(value) => update({ firstName: value })} />
            <Field label="Soyadı *" value={form.lastName} placeholder="Yılmaz" onChange={(value) => update({ lastName: value })} />
          </div>
          <Field label="LinkedIn Profil Adresi" value={form.linkedinUrl} placeholder="https://linkedin.com/in/username" onChange={updateLinkedIn} />
          <p className="-mt-2 text-xs text-muted-foreground">Profil adresindeki kullanıcı adından ad-soyad önerilir. Kaydetmeden önce doğrulayın.</p>
          <SelectField label="Departman *" value={form.departmentId} placeholder="Departman seçin" emptyText="Aktif departman bulunmuyor" items={departments.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(value) => update({ departmentId: value, positionId: "" })} />
          <SelectField label="Başvurulan Pozisyon *" value={form.positionId} placeholder={form.departmentId ? "Pozisyon seçin" : "Önce departman seçin"} emptyText="Bu departmanda açık pozisyon bulunmuyor" disabled={!form.departmentId} items={positions.map((item) => ({ value: String(item.id), label: item.title }))} onChange={(value) => update({ positionId: value })} />
          <SelectField label="Süreç Pipeline *" value={form.pipelineId} placeholder="Pipeline seçin" emptyText="Pipeline bulunmuyor" items={pipelines.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(value) => update({ pipelineId: value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={onSave} disabled={submitting} className="bg-primary text-white hover:bg-primary/95">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? "Ekleniyor" : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label><Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function SelectField({ label, value, placeholder, emptyText, items, disabled, onChange }: { label: string; value: string; placeholder: string; emptyText: string; items: Array<{ value: string; label: string }>; disabled?: boolean; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label><Select value={value} disabled={disabled} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{items.length ? items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>) : <SelectItem value="none" disabled>{emptyText}</SelectItem>}</SelectContent></Select></div>;
}
