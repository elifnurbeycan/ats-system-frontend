import { useEffect, useState } from "react";
import { ArrowRight, Loader2, MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface StageChangeDialogProps {
  open: boolean;
  candidateName: string;
  applicationLabel?: string | null;
  fromStage?: string | null;
  toStage?: string | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note?: string) => void | Promise<void>;
}

export function StageChangeDialog({
  open,
  candidateName,
  applicationLabel,
  fromStage,
  toStage,
  loading = false,
  onOpenChange,
  onConfirm,
}: StageChangeDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open, fromStage, toStage]);

  const submit = async () => {
    await onConfirm(note.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Aşama değişikliğini kaydet</DialogTitle>
          <DialogDescription>
            {candidateName} için yapılan bu değişiklik aşama geçmişine kaydedilecektir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {applicationLabel && (
            <div className="rounded-md bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
              Başvuru: {applicationLabel}
            </div>
          )}
          <div className="grid min-w-0 grid-cols-1 items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
            <span className="min-w-0 break-words text-muted-foreground sm:truncate" title={fromStage || "Mevcut aşama"}>
              {fromStage || "Mevcut aşama"}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-primary sm:rotate-0" />
            <span className="min-w-0 break-words font-medium text-foreground sm:truncate" title={toStage || "Yeni aşama"}>
              {toStage || "Yeni aşama"}
            </span>
          </div>

          <div className="space-y-2">
            <label htmlFor="stage-change-note" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
              Geçiş notu <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
            </label>
            <Textarea
              id="stage-change-note"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder="Görüşme sonucu, değerlendirme veya sonraki adım hakkında kısa bir not ekleyin..."
              rows={4}
              disabled={loading}
            />
            <p className="text-right text-xs text-muted-foreground">{note.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button type="button" disabled={loading} onClick={submit}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Aşamayı değiştir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
