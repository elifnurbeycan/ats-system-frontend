import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Pipeline } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StageType = "ACTIVE" | "HIRED" | "REJECTED" | "ON_HOLD";
export type PipelineEditPayload = { name: string; description: string; defaultPipeline: boolean; stages: Array<{ id: number | null; name: string; description: string; stageType: StageType }> };

export function EditPipelineDialog({ open, pipeline, saving, onOpenChange, onSave }: { open: boolean; pipeline: Pipeline | null; saving: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: PipelineEditPayload) => void }) {
  const [form, setForm] = useState<PipelineEditPayload>({ name: "", description: "", defaultPipeline: false, stages: [] });
  useEffect(() => {
    if (!pipeline || !open) return;
    setForm({ name: pipeline.name, description: pipeline.description || "", defaultPipeline: pipeline.defaultPipeline,
      stages: [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder).map((stage) => ({ id: stage.id, name: stage.name, description: stage.description || "", stageType: stage.stageType })) });
  }, [pipeline, open]);
  const updateStage = (index: number, values: Partial<PipelineEditPayload["stages"][number]>) => setForm((current) => ({ ...current, stages: current.stages.map((stage, i) => i === index ? { ...stage, ...values } : stage) }));
  const addStage = () => setForm((current) => ({ ...current, stages: [...current.stages, { id: null, name: "", description: "", stageType: "ACTIVE" }] }));
  const removeStage = (index: number) => setForm((current) => ({ ...current, stages: current.stages.filter((_, i) => i !== index) }));
  const hasActiveStage = form.stages.some((stage) => stage.stageType === "ACTIVE");
  const valid = Boolean(form.name.trim() && form.stages.length && hasActiveStage && form.stages.every((stage) => stage.name.trim()));

  return <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>İşe alım sürecini düzenle</DialogTitle><DialogDescription>Pipeline bilgilerini ve aşamalarını güncelleyin. Kullanımda aday bulunan aşamalar silinemez.</DialogDescription></DialogHeader>
    <div className="space-y-4 py-2">
      <div className="space-y-1.5"><label className="text-sm font-medium">Pipeline adı *</label><Input value={form.name} maxLength={150} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="space-y-1.5"><label className="text-sm font-medium">Açıklama</label><textarea value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
      <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><input type="checkbox" checked={form.defaultPipeline} onChange={(e) => setForm({ ...form, defaultPipeline: e.target.checked })} />Varsayılan pipeline olarak ayarla</label>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Pipeline aşamaları</p><p className="text-xs text-muted-foreground">Silme işlemi kaydettiğinizde uygulanır.</p></div><Button type="button" variant="outline" size="sm" onClick={addStage}><Plus className="mr-1.5 h-4 w-4" />Yeni aşama ekle</Button></div>
        {form.stages.map((stage, index) => <div key={stage.id ?? `new-${index}`} className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-[2rem_1fr_12rem_auto]">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">{index + 1}</span>
          <Input value={stage.name} maxLength={150} placeholder="Aşama adı" onChange={(e) => updateStage(index, { name: e.target.value })} />
          <Select value={stage.stageType} onValueChange={(value) => updateStage(index, { stageType: value as StageType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Aktif süreç</SelectItem><SelectItem value="HIRED">İşe alındı</SelectItem><SelectItem value="ON_HOLD">Beklemede</SelectItem><SelectItem value="REJECTED">Reddedildi</SelectItem></SelectContent></Select>
          <Button type="button" variant="ghost" size="icon" title="Aşamayı sil" disabled={form.stages.length <= 1} onClick={() => removeStage(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>)}
        {!hasActiveStage && <p className="text-xs text-destructive">Pipeline içinde en az bir aktif süreç aşaması bulunmalıdır.</p>}
      </div>
    </div>
    <DialogFooter><Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Vazgeç</Button><Button disabled={saving || !valid} onClick={() => onSave(form)}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Değişiklikleri kaydet</Button></DialogFooter>
  </DialogContent></Dialog>;
}
