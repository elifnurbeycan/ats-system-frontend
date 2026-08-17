import { useEffect, useState } from "react";
import { Download, ExternalLink, MessageCircle, Search, Send, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { PageData } from "@/lib/api";
import type { InteractionChannel } from "@/lib/api/interaction-api";
import { exportExcel } from "@/lib/excel";
import {
  contactLeadApi,
  type ContactLead,
  type ContactLeadStatus,
  type ContactRejectionReason,
  type ContactResolution,
} from "@/lib/api/contact-lead-api";

const channelLabels: Record<InteractionChannel, string> = {
  LINKEDIN: "LinkedIn", EMAIL: "E-posta", PHONE: "Telefon", WHATSAPP: "WhatsApp", OTHER: "Diğer",
};
const rejectionLabels: Record<ContactRejectionReason, string> = {
  NO_RESPONSE: "Yanıt alınamadı",
  NOT_INTERESTED: "İlgilenmiyor",
  POSITION_MISMATCH: "Pozisyon uygun değil",
  SALARY_EXPECTATION: "Maaş beklentisi uyuşmadı",
  LOCATION: "Konum / çalışma modeli",
  TIMING: "Zamanlama uygun değil",
  ACCEPTED_ANOTHER_OFFER: "Başka bir teklifi kabul etti",
  OTHER: "Diğer",
};
const statusLabels: Record<ContactLeadStatus, string> = {
  CONTACTING: "İletişimde", CONVERTED: "Aday sürecine alındı", REJECTED: "Reddedildi",
};

const formatDateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  : "—";

export default function Communications() {
  const [data, setData] = useState<PageData<ContactLead> | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContactLeadStatus | "ALL">("CONTACTING");
  const [rejectionReasonFilter, setRejectionReasonFilter] = useState<ContactRejectionReason | "ALL">("ALL");
  const [selected, setSelected] = useState<ContactLead | null>(null);
  const [resolution, setResolution] = useState<ContactResolution>("WAITING");
  const [channel, setChannel] = useState<InteractionChannel>("LINKEDIN");
  const [rejectionReason, setRejectionReason] = useState<ContactRejectionReason | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [, navigate] = useLocation();

  const roles = (() => {
    try { return JSON.parse(sessionStorage.getItem("user_data") || "{}").roles || []; }
    catch { return []; }
  })();

  useEffect(() => {
    if (!roles.some((role: string) => role === "HR" || role === "RECRUITER")) navigate("/");
  }, [navigate]);

  const loadData = () => contactLeadApi.getPage({
    page, size: 12, search: search.trim() || undefined, status: status === "ALL" ? undefined : status,
    rejectionReason: rejectionReasonFilter === "ALL" ? undefined : rejectionReasonFilter,
  }).then(setData).catch((error) => toast.error(error.response?.data?.message || "İletişim kayıtları yüklenemedi."));

  useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [page, search, status, rejectionReasonFilter]);

  const openResult = (lead: ContactLead) => {
    setSelected(lead); setResolution("WAITING"); setChannel(lead.contactChannel || "LINKEDIN");
    setRejectionReason(""); setNote(lead.note || "");
  };

  const save = async () => {
    if (!selected || (resolution === "REJECTED" && !rejectionReason)) return;
    setSaving(true);
    try {
      await contactLeadApi.resolve(selected.id, {
        resolution, channel,
        rejectionReason: resolution === "REJECTED" && rejectionReason ? rejectionReason : undefined,
        note: note.trim() || undefined,
      });
      toast.success(resolution === "POSITIVE" ? "Olumlu dönüş kaydedildi; kişi aday sürecine alındı."
        : resolution === "REJECTED" ? "Ret nedeni ve iletişim notu kaydedildi."
        : "İletişim bilgisi güncellendi.");
      setSelected(null); loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "İletişim sonucu kaydedilemedi.");
    } finally { setSaving(false); }
  };

  const exportCommunications = async () => {
    setExporting(true);
    try {
      const filters = {
        search: search.trim() || undefined,
        status: status === "ALL" ? undefined : status,
        rejectionReason: rejectionReasonFilter === "ALL" ? undefined : rejectionReasonFilter,
      };
      const firstPage = await contactLeadApi.getPage({ ...filters, page: 0, size: 100 });
      const pages = [firstPage];
      for (let currentPage = 1; currentPage < firstPage.totalPages; currentPage += 1) {
        pages.push(await contactLeadApi.getPage({ ...filters, page: currentPage, size: 100 }));
      }
      const leads = pages.flatMap((result) => result.content);
      if (leads.length === 0) {
        toast.error("Excel'e aktarılacak iletişim kaydı bulunamadı.");
        return;
      }
      await exportExcel(leads.map((lead) => ({
        "Kişi": lead.fullName,
        "Pozisyon": lead.positionTitle,
        "Departman": lead.departmentName,
        "Pipeline": lead.pipelineName,
        "LinkedIn": lead.linkedinUrl,
        "Durum": statusLabels[lead.status],
        "İletişim Kanalı": lead.contactChannel ? channelLabels[lead.contactChannel] : "",
        "Ret Nedeni": lead.rejectionReason ? rejectionLabels[lead.rejectionReason] : "",
        "İletişim Notu": lead.note,
        "Sonuç Tarihi": lead.resolvedAt ? new Date(lead.resolvedAt).toLocaleString("tr-TR") : "",
        "Eklenme Tarihi": new Date(lead.createdAt).toLocaleString("tr-TR"),
      })), "iletisim-raporu", "İletişim");
      toast.success(`${leads.length} iletişim kaydı Excel'e aktarıldı.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "İletişim raporu oluşturulamadı.");
    } finally {
      setExporting(false);
    }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-foreground">İletişim</h1><p className="mt-1 text-sm text-muted-foreground">İlk temasları yönetin; olumlu dönüş alan kişileri aday sürecine aktarın.</p></div><button type="button" disabled={exporting} onClick={exportCommunications} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"><Download className="h-4 w-4" />{exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}</button></div>
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex flex-wrap gap-2" aria-label="İletişim durumu filtresi">
          {([
            ["CONTACTING", "İletişimde"],
            ["REJECTED", "Reddedilenler"],
            ["CONVERTED", "Aday sürecine alınanlar"],
            ["ALL", "Tümü"],
          ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => {
            setStatus(value); setPage(0);
            if (value !== "REJECTED" && value !== "ALL") setRejectionReasonFilter("ALL");
          }} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${status === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>{label}</button>)}
        </div>
        <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[280px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Ad, LinkedIn veya pozisyon ara..." className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary" /></div>
        {(status === "REJECTED" || status === "ALL") && <select aria-label="Ret nedenine göre filtrele" value={rejectionReasonFilter} onChange={(e) => { setRejectionReasonFilter(e.target.value as ContactRejectionReason | "ALL"); setPage(0); }} className="rounded-xl border border-border bg-background px-3 text-sm"><option value="ALL">Tüm ret nedenleri</option>{Object.entries(rejectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1260px] text-left text-sm">
        <thead className="border-b border-border bg-muted/35 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Kişi</th><th className="px-5 py-3">Pozisyon / Departman</th><th className="px-5 py-3">LinkedIn</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">Ret nedeni</th><th className="px-5 py-3">Not</th><th className="px-5 py-3">Sonuç zamanı</th><th className="px-5 py-3 text-right">İşlemler</th></tr></thead>
        <tbody className="divide-y divide-border">{data?.content.map((lead) => <tr key={lead.id} className="hover:bg-muted/25">
          <td className="px-5 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{lead.firstName[0]}{lead.lastName[0]}</span><span className="font-medium">{lead.fullName}</span></div></td>
          <td className="px-5 py-3"><div>{lead.positionTitle}</div><div className="text-xs text-muted-foreground">{lead.departmentName}</div></td>
          <td className="px-5 py-3">{lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Profili aç <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-muted-foreground">—</span>}</td>
          <td className="px-5 py-3"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{statusLabels[lead.status]}</span></td>
          <td className="px-5 py-3 text-muted-foreground">{lead.rejectionReason ? rejectionLabels[lead.rejectionReason] : "—"}</td>
          <td className="max-w-[260px] truncate px-5 py-3 text-muted-foreground" title={lead.note || undefined}>{lead.note || "—"}</td>
          <td className="whitespace-nowrap px-5 py-3 text-muted-foreground"><div>{formatDateTime(lead.resolvedAt)}</div>{lead.resolvedAt && <div className="mt-0.5 text-xs">{lead.status === "REJECTED" ? "Red zamanı" : lead.status === "CONVERTED" ? "Aday sürecine alınma" : "Son güncelleme"}</div>}</td>
          <td className="px-5 py-3 text-right">{lead.status === "CONTACTING" && <button onClick={() => openResult(lead)} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"><MessageCircle className="h-4 w-4" /> Sonuç gir</button>}</td>
        </tr>)}{data && data.content.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">İletişim kaydı bulunamadı.</td></tr>}</tbody>
      </table></div>
      {data && <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm"><span className="text-muted-foreground">Sayfa {data.page + 1} / {Math.max(data.totalPages, 1)} · {data.totalElements} kayıt</span><div className="flex gap-2"><button disabled={data.first} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Önceki</button><button disabled={data.last} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sonraki</button></div></div>}
    </div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">İletişim sonucunu kaydet</h2><p className="text-sm text-muted-foreground">{selected.fullName} · {selected.positionTitle}</p></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></div>
      <div className="space-y-4 p-5">
        <label className="block text-sm font-medium">Sonuç<select value={resolution} onChange={(e) => { setResolution(e.target.value as ContactResolution); setRejectionReason(""); }} className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5"><option value="WAITING">İletişim sürüyor / yanıt bekleniyor</option><option value="POSITIVE">Olumlu dönüş — aday sürecine al</option><option value="REJECTED">Reddedildi</option></select></label>
        <label className="block text-sm font-medium">Kanal<select value={channel} onChange={(e) => setChannel(e.target.value as InteractionChannel)} className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5">{Object.entries(channelLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {resolution === "REJECTED" && <label className="block text-sm font-medium">Ret nedeni *<select value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value as ContactRejectionReason)} className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5"><option value="">Ret nedeni seçin</option>{Object.entries(rejectionLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className="block text-sm font-medium">İletişim notu <span className="font-normal text-muted-foreground">(ret nedeninden bağımsız)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} rows={4} className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background p-2.5" placeholder="Görüşme detayları, takip bilgisi veya ek not..." /></label>
      </div>
      <div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2">Vazgeç</button><button disabled={saving || (resolution === "REJECTED" && !rejectionReason)} onClick={save} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" />{saving ? "Kaydediliyor..." : "Kaydet"}</button></div>
    </div></div>}
  </div>;
}
