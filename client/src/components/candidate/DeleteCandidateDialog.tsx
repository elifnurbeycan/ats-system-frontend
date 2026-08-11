import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteCandidateDialog({ open, candidateName, submitting, onOpenChange, onConfirm }: { open: boolean; candidateName: string; submitting: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[420px]"><DialogHeader><DialogTitle>Adayı Sil</DialogTitle><DialogDescription><strong>{candidateName}</strong> isimli adayı silmek istediğinize emin misiniz? Bu aday süreç listelerinden kaldırılacaktır.</DialogDescription></DialogHeader><DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button><Button onClick={onConfirm} disabled={submitting} variant="destructive">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? "Siliniyor" : "Evet, Sil"}</Button></DialogFooter></DialogContent></Dialog>;
}
