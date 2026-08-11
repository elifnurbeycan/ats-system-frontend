import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { page: number; totalPages: number; loading: boolean; onPageChange: (page: number) => void };

export function CandidatePagination({ page, totalPages, loading, onPageChange }: Props) {
  const pageCount = Math.max(1, totalPages);
  const currentPage = Math.min(page, pageCount - 1);
  const start = Math.max(0, Math.min(currentPage - 2, pageCount - 5));
  const visible = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);
  return <div className="flex items-center justify-between border-t border-border px-5 py-4">
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Sayfa {currentPage + 1} / {pageCount}</span>
      <Select value={String(currentPage)} disabled={pageCount === 1 || loading} onValueChange={(value) => onPageChange(Number(value))}>
        <SelectTrigger className="h-9 w-36" aria-label="Sayfaya git"><SelectValue placeholder="Sayfaya git" /></SelectTrigger>
        <SelectContent className="max-h-72">{Array.from({ length: pageCount }, (_, number) =>
          <SelectItem key={number} value={String(number)}>{number + 1}. sayfa</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => onPageChange(page - 1)}>Önceki</Button>
      {visible[0] > 0 && <><Button variant="outline" size="sm" onClick={() => onPageChange(0)}>1</Button>{visible[0] > 1 && <span className="px-1 text-muted-foreground">…</span>}</>}
      {visible.map((number) => <Button key={number} variant={page === number ? "default" : "outline"} size="sm" className="min-w-9"
        disabled={loading} onClick={() => onPageChange(number)} aria-current={page === number ? "page" : undefined}>{number + 1}</Button>)}
      {visible.at(-1)! < totalPages - 1 && <>{visible.at(-1)! < totalPages - 2 && <span className="px-1 text-muted-foreground">…</span>}
        <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages - 1)}>{totalPages}</Button></>}
      <Button variant="outline" size="sm" disabled={page >= totalPages - 1 || loading} onClick={() => onPageChange(page + 1)}>Sonraki</Button>
    </div>
  </div>;
}
