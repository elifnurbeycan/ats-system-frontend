import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Download, ExternalLink, MessageCircle, Search, Send, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { PageData } from "@/lib/api";
import type { InteractionChannel } from "@/lib/api/interaction-api";
import { exportExcel } from "@/lib/excel";
import { hasPermission } from "@/lib/permissions";
import { ColumnFilterMenu } from "@/components/table/ColumnFilterMenu";
import type { DateRange } from "react-day-picker";
import { DateRangeFilter, isWithinDateRange } from "@/components/table/DateRangeFilter";
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
  CONTACTING: "İletişimde", CONVERTED: "Aday sürecine alındı", REJECTED: "Süreç sonlandı",
};

const formatDateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(value))
  : "—";

export default function Communications() {
  const [data, setData] = useState<PageData<ContactLead> | null>(null);
  const [overviewLeads, setOverviewLeads] = useState<ContactLead[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContactLeadStatus | "ALL">("CONTACTING");
  const [rejectionReasonFilter, setRejectionReasonFilter] = useState<ContactRejectionReason | "ALL">("ALL");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRange>();
  const [selected, setSelected] = useState<ContactLead | null>(null);
  const [resolution, setResolution] = useState<ContactResolution>("WAITING");
  const [channel, setChannel] = useState<InteractionChannel>("LINKEDIN");
  const [rejectionReason, setRejectionReason] = useState<ContactRejectionReason | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [, navigate] = useLocation();
  const canView = hasPermission("CONTACT_LEAD_VIEW");
  const canResolve = hasPermission("CONTACT_LEAD_RESOLVE");

  useEffect(() => {
    if (!canView) navigate("/");
  }, [canView, navigate]);

  const loadData = () => contactLeadApi.getPage({
    page, size: 12, search: search.trim() || undefined, status: status === "ALL" ? undefined : status,
    rejectionReason: rejectionReasonFilter === "ALL" ? undefined : rejectionReasonFilter,
  }).then(setData).catch((error) => toast.error(error.response?.data?.message || "İletişim kayıtları yüklenemedi."));

  useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [page, search, status, rejectionReasonFilter]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    const loadOverview = async () => {
      try {
        const firstPage = await contactLeadApi.getPage({ page: 0, size: 100 });
        const pages = [firstPage];
        for (let currentPage = 1; currentPage < firstPage.totalPages; currentPage += 1) {
          pages.push(await contactLeadApi.getPage({ page: currentPage, size: 100 }));
        }
        if (!cancelled) setOverviewLeads(pages.flatMap((result) => result.content));
      } catch (error: any) {
        if (!cancelled) toast.error(error.response?.data?.message || "Departman özeti yüklenemedi.");
      }
    };
    void loadOverview();
    return () => { cancelled = true; };
  }, [canView]);

  const departmentCards = useMemo(() => {
    const groups = new Map<number, { id: number; name: string; total: number; contacting: number; converted: number; ended: number }>();
    overviewLeads.forEach((lead) => {
      const current = groups.get(lead.departmentId) || { id: lead.departmentId, name: lead.departmentName, total: 0, contacting: 0, converted: 0, ended: 0 };
      current.total += 1;
      if (lead.status === "CONTACTING") current.contacting += 1;
      if (lead.status === "CONVERTED") current.converted += 1;
      if (lead.status === "REJECTED") current.ended += 1;
      groups.set(lead.departmentId, current);
    });
    return Array.from(groups.values()).sort((first, second) => first.name.localeCompare(second.name, "tr"));
  }, [overviewLeads]);

  const communicationColumnOptions = useMemo(() => ({
    statuses: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
    rejectionReasons: Object.entries(rejectionLabels).map(([value, label]) => ({ value, label })),
    linkedin: [
      { value: "WITH", label: "LinkedIn'i olanlar" },
      { value: "WITHOUT", label: "LinkedIn'i olmayanlar" },
    ],
    resolvedAt: [
      { value: "WITH", label: "Sonuçlananlar" },
      { value: "WITHOUT", label: "Sonuçlanmayanlar" },
    ],
  }), []);

  const setColumnFilter = (key: string, value: string) => {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  };

  const departmentLeads = useMemo(() => overviewLeads.filter((lead) => {
    if (selectedDepartmentId !== null && lead.departmentId !== selectedDepartmentId) return false;
    if (status !== "ALL" && lead.status !== status) return false;
    if (rejectionReasonFilter !== "ALL" && lead.rejectionReason !== rejectionReasonFilter) return false;
    if (!isWithinDateRange(lead.createdAt, dateRange)) return false;
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (query && !`${lead.fullName} ${lead.positionTitle} ${lead.departmentName} ${lead.linkedinUrl || ""}`.toLocaleLowerCase("tr-TR").includes(query)) return false;
    const contains = (value: unknown, key: string) => !columnFilters[key]
      || String(value ?? "").toLocaleLowerCase("tr-TR").includes(columnFilters[key].toLocaleLowerCase("tr-TR"));
    const equals = (value: unknown, key: string) => !columnFilters[key] || String(value ?? "") === columnFilters[key];
    const presence = (value: unknown, key: string) => !columnFilters[key]
      || (columnFilters[key] === "WITH" ? Boolean(value) : !value);
    return contains(lead.fullName, "name")
      && contains(`${lead.positionTitle} ${lead.departmentName}`, "position")
      && presence(lead.linkedinUrl, "linkedin")
      && equals(lead.status, "status")
      && equals(lead.rejectionReason, "rejectionReason")
      && contains(lead.note, "note")
      && presence(lead.resolvedAt, "resolvedAt");
  }), [overviewLeads, selectedDepartmentId, status, rejectionReasonFilter, search, columnFilters, dateRange]);

  const displayedLeads = selectedDepartmentId !== null ? departmentLeads : (data?.content || []);
  const selectedDepartment = departmentCards.find((department) => department.id === selectedDepartmentId);

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
        : resolution === "REJECTED" ? "Süreç sonlanma nedeni ve iletişim notu kaydedildi."
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
      let leads: ContactLead[];
      if (selectedDepartmentId !== null) {
        leads = departmentLeads;
      } else {
        const firstPage = await contactLeadApi.getPage({ ...filters, page: 0, size: 100 });
        const pages = [firstPage];
        for (let currentPage = 1; currentPage < firstPage.totalPages; currentPage += 1) {
          pages.push(await contactLeadApi.getPage({ ...filters, page: currentPage, size: 100 }));
        }
        leads = pages.flatMap((result) => result.content);
      }
      if (leads.length === 0) {
        toast.error("Excel'e aktarılacak iletişim kaydı bulunamadı.");
        return;
      }
      await exportExcel(leads.map((lead) => ({
        "Kişi": lead.fullName,
        "Pozisyon": lead.positionTitle,
        "Departman": lead.departmentName,
        "İşe alım süreci": lead.pipelineName,
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

  if (!canView) return null;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-foreground">İletişim</h1><p className="mt-1 text-sm text-muted-foreground">İlk temasları yönetin; olumlu dönüş alan kişileri aday sürecine aktarın.</p></div><button type="button" disabled={exporting} onClick={exportCommunications} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"><Download className="h-4 w-4" />{exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}</button></div>
    {selectedDepartmentId === null ? <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid min-h-[360px] grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/20 p-5 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold text-foreground">İletişim</p>
          <button type="button" className="mt-4 flex w-full items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-left text-sm font-medium text-primary"><Building2 className="h-4 w-4" /> Departmanlar</button>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Bir departman seçerek o departmandaki iletişim kayıtlarını görüntüleyin.</p>
        </aside>
        <div className="p-5">
          <div className="mb-4"><h2 className="text-lg font-semibold text-foreground">Departmanlar</h2><p className="mt-1 text-sm text-muted-foreground">İletişim kayıtları departmanlara göre listeleniyor.</p></div>
          {departmentCards.length === 0 ? <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Henüz iletişim kaydı bulunmuyor.</div> : <div className="divide-y divide-border rounded-xl border border-border">
            {departmentCards.map((department) => <button key={department.id} type="button" onClick={() => { setSelectedDepartmentId(department.id); setPage(0); }} className="flex w-full items-center gap-4 p-4 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-primary/5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate font-semibold text-foreground">{department.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{department.total} iletişim kaydı</span></span>
              <span className="hidden items-center gap-5 text-xs sm:flex"><span><b className="mr-1 font-mono text-sky-600">{department.contacting}</b>İletişimde</span><span><b className="mr-1 font-mono text-emerald-600">{department.converted}</b>Adaya dönüştü</span><span><b className="mr-1 font-mono text-rose-600">{department.ended}</b>Sonlandı</span></span>
              <span className="text-xl text-muted-foreground">›</span>
            </button>)}
          </div>}
        </div>
      </div>
    </section> : <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border p-4"><button type="button" onClick={() => { setSelectedDepartmentId(null); setSearch(""); setStatus("CONTACTING"); setRejectionReasonFilter("ALL"); setColumnFilters({}); setDateRange(undefined); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Departmanlara dön</button><div><p className="font-semibold text-foreground">{selectedDepartment?.name}</p><p className="text-xs text-muted-foreground">Bu departmanın iletişim kayıtları</p></div></div>
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex flex-wrap gap-2" aria-label="İletişim durumu filtresi">
          {([
            ["CONTACTING", "İletişimde"],
            ["REJECTED", "Süreci sonlananlar"],
            ["CONVERTED", "Aday sürecine alınanlar"],
            ["ALL", "Tümü"],
          ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => {
            setStatus(value); setPage(0);
            if (value !== "REJECTED" && value !== "ALL") setRejectionReasonFilter("ALL");
          }} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${status === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>{label}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Ad, LinkedIn veya pozisyon ara..." className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary" /></div>
        <DateRangeFilter value={dateRange} onChange={(value) => { setDateRange(value); setPage(0); }} label="İletişim tarihi" />
        {(status === "REJECTED" || status === "ALL") && <select aria-label="Süreç sonlanma nedenine göre filtrele" value={rejectionReasonFilter} onChange={(e) => { setRejectionReasonFilter(e.target.value as ContactRejectionReason | "ALL"); setPage(0); }} className="rounded-xl border border-border bg-background px-3 text-sm"><option value="ALL">Tüm sonlanma nedenleri</option>{Object.entries(rejectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1260px] text-left text-sm">
        <thead className="border-b border-border bg-muted/35 text-xs uppercase text-muted-foreground"><tr>
          <th className="px-5 py-3"><ColumnFilterMenu label="Kişi" value={columnFilters.name || ""} onChange={(value) => setColumnFilter("name", value)} placeholder="İsim ara..." /></th>
          <th className="px-5 py-3"><ColumnFilterMenu label="Pozisyon / Departman" value={columnFilters.position || ""} onChange={(value) => setColumnFilter("position", value)} placeholder="Pozisyon veya departman ara..." /></th>
          <th className="px-5 py-3"><ColumnFilterMenu label="LinkedIn" value={columnFilters.linkedin || ""} onChange={(value) => setColumnFilter("linkedin", value)} options={communicationColumnOptions.linkedin} /></th>
          <th className="px-5 py-3"><ColumnFilterMenu label="Durum" value={columnFilters.status || ""} onChange={(value) => setColumnFilter("status", value)} options={communicationColumnOptions.statuses} /></th>
          <th className="px-5 py-3"><ColumnFilterMenu label="Sonlanma nedeni" value={columnFilters.rejectionReason || ""} onChange={(value) => setColumnFilter("rejectionReason", value)} options={communicationColumnOptions.rejectionReasons} /></th>
          <th className="px-5 py-3"><ColumnFilterMenu label="Not" value={columnFilters.note || ""} onChange={(value) => setColumnFilter("note", value)} placeholder="Not ara..." /></th>
          <th className="px-5 py-3"><ColumnFilterMenu label="Sonuç zamanı" value={columnFilters.resolvedAt || ""} onChange={(value) => setColumnFilter("resolvedAt", value)} options={communicationColumnOptions.resolvedAt} /></th>
          <th className="px-5 py-3 text-right">İşlemler</th>
        </tr></thead>
        <tbody className="divide-y divide-border">{displayedLeads.map((lead) => <tr key={lead.id} className="hover:bg-muted/25">
          <td className="px-5 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{lead.firstName[0]}{lead.lastName[0]}</span><span className="font-medium">{lead.fullName}</span></div></td>
          <td className="px-5 py-3"><div>{lead.positionTitle}</div><div className="text-xs text-muted-foreground">{lead.departmentName}</div></td>
          <td className="px-5 py-3">{lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Profili aç <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-muted-foreground">—</span>}</td>
          <td className="px-5 py-3"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{statusLabels[lead.status]}</span></td>
          <td className="px-5 py-3 text-muted-foreground">{lead.rejectionReason ? rejectionLabels[lead.rejectionReason] : "—"}</td>
          <td className="max-w-[260px] truncate px-5 py-3 text-muted-foreground" title={lead.note || undefined}>{lead.note || "—"}</td>
          <td className="whitespace-nowrap px-5 py-3 text-muted-foreground"><div>{formatDateTime(lead.resolvedAt)}</div>{lead.resolvedAt && <div className="mt-0.5 text-xs">{lead.status === "REJECTED" ? "Süreç sonlanma zamanı" : lead.status === "CONVERTED" ? "Aday sürecine alınma" : "Son güncelleme"}</div>}</td>
          <td className="px-5 py-3 text-right">{canResolve && lead.status === "CONTACTING" && <button onClick={() => openResult(lead)} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"><MessageCircle className="h-4 w-4" /> Sonuç gir</button>}</td>
        </tr>)}{displayedLeads.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Bu departmanda iletişim kaydı bulunamadı.</td></tr>}</tbody>
      </table></div>
      {selectedDepartmentId === null ? data && <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm"><span className="text-muted-foreground">Sayfa {data.page + 1} / {Math.max(data.totalPages, 1)} · {data.totalElements} kayıt</span><div className="flex gap-2"><button disabled={data.first} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Önceki</button><button disabled={data.last} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sonraki</button></div></div> : <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">{displayedLeads.length} kayıt gösteriliyor</div>}
    </div>}
    {selected && canResolve && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">İletişim sonucunu kaydet</h2><p className="text-sm text-muted-foreground">{selected.fullName} · {selected.positionTitle}</p></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></div>
      <div className="space-y-4 p-5">
        <label className="block text-sm font-medium">Sonuç<select value={resolution} onChange={(e) => { setResolution(e.target.value as ContactResolution); setRejectionReason(""); }} className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5"><option value="WAITING">İletişim sürüyor / yanıt bekleniyor</option><option value="POSITIVE">Olumlu dönüş — aday sürecine al</option><option value="REJECTED">Süreç sonlandı</option></select></label>
        <label className="block text-sm font-medium">Kanal<select value={channel} onChange={(e) => setChannel(e.target.value as InteractionChannel)} className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5">{Object.entries(channelLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {resolution === "REJECTED" && <label className="block text-sm font-medium">Sonlanma nedeni *<select value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value as ContactRejectionReason)} className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5"><option value="">Sonlanma nedeni seçin</option>{Object.entries(rejectionLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className="block text-sm font-medium">İletişim notu <span className="font-normal text-muted-foreground">(sonlanma nedeninden bağımsız)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} rows={4} className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background p-2.5" placeholder="Görüşme detayları, takip bilgisi veya ek not..." /></label>
      </div>
      <div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2">Vazgeç</button><button disabled={saving || (resolution === "REJECTED" && !rejectionReason)} onClick={save} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" />{saving ? "Kaydediliyor..." : "Kaydet"}</button></div>
    </div></div>}
  </div>;
}
