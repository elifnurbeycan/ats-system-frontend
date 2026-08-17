import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Users as UsersIcon,
  Briefcase,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  PauseCircle,
  UserCheck,
  Loader2,
  CalendarDays,
  FilePlus2,
  MessageCircle,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardApi, candidateApi, type DashboardData } from "@/lib/api";
import { contactLeadApi, type ContactRejectionReason } from "@/lib/api/contact-lead-api";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactStats, setContactStats] = useState({ contacting: 0, converted: 0, rejected: 0 });
  const [contactRejectionStats, setContactRejectionStats] = useState<Record<ContactRejectionReason, number>>({
    NO_RESPONSE: 0, NOT_INTERESTED: 0, POSITION_MISMATCH: 0, SALARY_EXPECTATION: 0,
    LOCATION: 0, TIMING: 0, ACCEPTED_ANOTHER_OFFER: 0, OTHER: 0,
  });
  const [analysisPeriod, setAnalysisPeriod] = useState<"weekly" | "monthly" | "allTime">("weekly");

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const summaryData = await dashboardApi.getSummary();
        setData(summaryData);
      } catch (err: any) {
        toast.error("Dashboard özeti yüklenemedi: " + (err.response?.data?.message || err.message || "Bilinmeyen hata"));
      }

      try {
        const candidatesList = await candidateApi.getAll();
        // Fetch details for the first 5 candidates to get their process details
        const topCandidates = candidatesList.slice(0, 5);
        const detailedCandidates = await Promise.all(
          topCandidates.map(async (c) => {
            try {
              const detail = await candidateApi.getById(c.id);
              return detail;
            } catch {
              return { candidate: c, processes: [] };
            }
          })
        );
        setRecentCandidates(detailedCandidates);
      } catch {
        // Silent — candidates widget will just be empty
      }

      try {
        const roles = JSON.parse(sessionStorage.getItem("user_data") || "{}").roles || [];
        if (roles.some((role: string) => role === "HR" || role === "RECRUITER")) {
          const [contacting, converted, rejected] = await Promise.all([
            contactLeadApi.getPage({ page: 0, size: 1, status: "CONTACTING" }),
            contactLeadApi.getPage({ page: 0, size: 1, status: "CONVERTED" }),
            contactLeadApi.getPage({ page: 0, size: 1, status: "REJECTED" }),
          ]);
          setContactStats({
            contacting: contacting.totalElements,
            converted: converted.totalElements,
            rejected: rejected.totalElements,
          });
          const rejectionReasons: ContactRejectionReason[] = [
            "NO_RESPONSE", "NOT_INTERESTED", "POSITION_MISMATCH", "SALARY_EXPECTATION",
            "LOCATION", "TIMING", "ACCEPTED_ANOTHER_OFFER", "OTHER",
          ];
          const reasonPages = await Promise.all(rejectionReasons.map((rejectionReason) =>
            contactLeadApi.getPage({ page: 0, size: 1, status: "REJECTED", rejectionReason }),
          ));
          setContactRejectionStats(Object.fromEntries(rejectionReasons.map((reason, index) =>
            [reason, reasonPages[index].totalElements],
          )) as Record<ContactRejectionReason, number>);
        }
      } catch {
        // İletişim modülü yetkisi olmayan kullanıcılarda panel gösterilmez.
      } finally {
        setLoading(false);
      }

    };
    loadDashboardData();
  }, []);

  const stats = useMemo(() => {
    if (!data) {
      return {
        totalCandidates: 0,
        activePositions: 0,
        activeCount: 0,
        hiredCount: 0,
        rejectedCount: 0,
        onHoldCount: 0,
        totalProcesses: 0,
        hireRate: 0,
      };
    }

    const { summary, stageDistribution } = data;

    const countByType = (type: string) => stageDistribution
      .filter((stage) => stage.stageType === type)
      .reduce((total, stage) => total + stage.candidateCount, 0);

    const hired = countByType("HIRED");
    const rejected = countByType("REJECTED");
    const onHold = countByType("ON_HOLD");
    const active = countByType("ACTIVE");
    const totalProcesses = stageDistribution.reduce((total, stage) => total + stage.candidateCount, 0);
    const hireRate = totalProcesses > 0 ? Math.round((hired / totalProcesses) * 100) : 0;

    return {
      totalCandidates: summary.activeCandidateCount,
      activePositions: summary.openPositionCount,
      activeCount: active,
      hiredCount: hired,
      rejectedCount: rejected,
      onHoldCount: onHold,
      totalProcesses,
      hireRate,
    };
  }, [data]);

  const statCards = [
    {
      label: "Toplam Aday",
      value: stats.totalCandidates,
      icon: UsersIcon,
      color: "text-primary",
      bg: "bg-primary/10",
      trend: "Aktif Havuz",
    },
    {
      label: "Açık Pozisyon",
      value: stats.activePositions,
      icon: Briefcase,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      trend: "İlana Açık",
    },
    {
      label: "Aktif Süreç",
      value: stats.activeCount,
      icon: Clock,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      trend: "Devam Eden",
    },
    {
      label: "İşe Alınan",
      value: stats.hiredCount,
      icon: UserCheck,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
      trend: `Oran: %${stats.hireRate}`,
    },
  ];

  const canViewCommunications = (() => {
    try {
      const roles = JSON.parse(sessionStorage.getItem("user_data") || "{}").roles || [];
      return roles.some((role: string) => role === "HR" || role === "RECRUITER");
    } catch {
      return false;
    }
  })();
  const resolvedContacts = contactStats.converted + contactStats.rejected;
  const positiveContactRate = resolvedContacts > 0
    ? Math.round((contactStats.converted / resolvedContacts) * 100)
    : 0;
  const rejectionReasonLabels: Record<ContactRejectionReason, string> = {
    NO_RESPONSE: "Yanıt alınamadı",
    NOT_INTERESTED: "İlgilenmiyor",
    POSITION_MISMATCH: "Pozisyon uygun değil",
    SALARY_EXPECTATION: "Maaş beklentisi uyuşmadı",
    LOCATION: "Konum / çalışma modeli",
    TIMING: "Zamanlama uygun değil",
    ACCEPTED_ANOTHER_OFFER: "Başka bir teklifi kabul etti",
    OTHER: "Diğer",
  };
  const rejectionReasonRows = (Object.entries(contactRejectionStats) as [ContactRejectionReason, number][])
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount);

  const periodAnalytics = analysisPeriod === "weekly"
    ? data?.weeklyAnalytics
    : analysisPeriod === "monthly"
      ? data?.monthlyAnalytics
      : data?.allTimeAnalytics;
  const periodLabel = analysisPeriod === "weekly" ? "Son 7 gün" : analysisPeriod === "monthly" ? "Son 30 gün" : "Sistem başlangıcından bugüne";
  const periodTitle = analysisPeriod === "weekly" ? "Haftalık" : analysisPeriod === "monthly" ? "Aylık" : "Tüm Zamanlar";
  const periodHireRate = periodAnalytics?.newApplicationCount
    ? Math.round((periodAnalytics.hiredCount / periodAnalytics.newApplicationCount) * 100)
    : 0;

  const monthlyTrendData = useMemo(() =>
    (data?.monthlyApplicationTrend || []).map((item) => ({
      label: new Date(item.monthStart).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
      başvuru: item.applicationCount,
    })), [data?.monthlyApplicationTrend]);

  const departmentChartData = useMemo(() =>
    (data?.departmentDistribution || []).map((item) => ({
      name: item.departmentName,
      başvuru: item.applicationCount,
    })), [data?.departmentDistribution]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 animate-slide-up sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Kontrol Paneli</h1>
          <p className="text-muted-foreground mt-1">İşe alım metrikleri ve dönemsel performans analizi</p>
        </div>
        <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1 shadow-sm">
          {(["weekly", "monthly", "allTime"] as const).map((period) => (
            <button
              type="button"
              key={period}
              onClick={() => setAnalysisPeriod(period)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                analysisPeriod === period
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {period === "weekly" ? "Haftalık" : period === "monthly" ? "Aylık" : "Tüm Zamanlar"}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass glass-hover rounded-2xl p-5 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="font-mono text-3xl font-semibold mt-2 text-foreground">
                    {card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    card.bg
                  )}
                >
                  <Icon className={cn("h-6 w-6", card.color)} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {card.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {canViewCommunications && <section className="enterprise-panel overflow-hidden animate-slide-up" style={{ animationDelay: "210ms" }}>
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">İletişim Havuzu</h2>
            <p className="mt-1 text-xs text-muted-foreground">İlk temasların güncel durumu ve aday sürecine dönüşümü</p>
          </div>
          <Link href="/iletisim" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            İletişim kayıtlarını aç <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "İletişimde bekleyen", value: contactStats.contacting, icon: MessageCircle, tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
            { label: "Aday sürecine alınan", value: contactStats.converted, icon: UserCheck, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
            { label: "İletişimde reddedilen", value: contactStats.rejected, icon: XCircle, tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
            { label: "Olumlu dönüş oranı", value: `%${positiveContactRate}`, icon: Send, tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
          ].map((metric) => {
            const Icon = metric.icon;
            return <div key={metric.label} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", metric.tone)}><Icon className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-0.5 font-mono text-2xl font-bold text-foreground">{metric.value}</p></div>
            </div>;
          })}
        </div>
        <div className="flex flex-col gap-2 border-t border-border bg-muted/15 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Olumlu dönüş oranı, sonuçlanan iletişimlerden aday sürecine aktarılanların oranıdır.</p>
          <div className="flex items-center gap-3"><div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${positiveContactRate}%` }} /></div><span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">%{positiveContactRate}</span></div>
        </div>
        <div className="border-t border-border p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">İletişim ret nedenleri</h3>
            <p className="mt-1 text-xs text-muted-foreground">İletişim aşamasında reddedilen kişilerin neden dağılımı</p>
          </div>
          {contactStats.rejected === 0 ? <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Henüz reddedilmiş iletişim kaydı bulunmuyor.</div> : <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/35 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Ret nedeni</th><th className="w-24 px-4 py-3 text-right">Kayıt</th><th className="w-[38%] px-4 py-3">Dağılım</th></tr></thead>
              <tbody className="divide-y divide-border">{rejectionReasonRows.map(([reason, count]) => {
                const percentage = contactStats.rejected > 0 ? Math.round((count / contactStats.rejected) * 100) : 0;
                return <tr key={reason} className="hover:bg-muted/20"><td className="px-4 py-3 font-medium text-foreground">{rejectionReasonLabels[reason]}</td><td className="px-4 py-3 text-right font-mono font-semibold text-foreground">{count}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-rose-500" style={{ width: `${percentage}%` }} /></div><span className="w-10 text-right font-mono text-xs font-semibold text-muted-foreground">%{percentage}</span></div></td></tr>;
              })}</tbody>
            </table>
          </div>}
        </div>
      </section>}

      {/* Period analytics */}
      <section className="enterprise-panel overflow-hidden animate-slide-up" style={{ animationDelay: "240ms" }}>
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{periodTitle} Analiz</h2>
            <p className="mt-1 text-xs text-muted-foreground">{periodLabel} içindeki gerçek işe alım hareketleri</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            {analysisPeriod === "allTime"
              ? "Bugüne kadar"
              : periodAnalytics?.periodStart
              ? `${new Date(periodAnalytics.periodStart).toLocaleDateString("tr-TR")} tarihinden beri`
              : periodLabel}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Yeni aday", value: periodAnalytics?.newCandidateCount || 0, icon: UsersIcon, tone: "text-blue-600 bg-blue-50" },
            { label: "Yeni başvuru", value: periodAnalytics?.newApplicationCount || 0, icon: FilePlus2, tone: "text-indigo-600 bg-indigo-50" },
            { label: "Açılan pozisyon", value: periodAnalytics?.openedPositionCount || 0, icon: Briefcase, tone: "text-cyan-700 bg-cyan-50" },
            { label: "İşe alınan", value: periodAnalytics?.hiredCount || 0, icon: UserCheck, tone: "text-emerald-700 bg-emerald-50" },
            { label: "Reddedilen", value: periodAnalytics?.rejectedCount || 0, icon: XCircle, tone: "text-rose-600 bg-rose-50" },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", metric.tone)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-0.5 font-mono text-xl font-bold text-foreground">{metric.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/15 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Dönem işe alım oranı, bu dönemde işe alınanların yeni başvurulara oranıdır.
          </p>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(periodHireRate, 100)}%` }} />
            </div>
            <span className="font-mono text-sm font-bold text-emerald-700">%{periodHireRate}</span>
          </div>
        </div>
      </section>

      {/* Recruitment charts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5 animate-slide-up" style={{ animationDelay: "280ms" }}>
        <div className="enterprise-panel p-5 xl:col-span-3">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Aylık Başvuru Trendi</h2>
              <p className="mt-1 text-xs text-muted-foreground">Son 12 ayda sisteme eklenen gerçek başvurular</p>
            </div>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              12 aylık görünüm
            </span>
          </div>

          <div className="h-[280px] w-full">
            {monthlyTrendData.every((item) => item.başvuru === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Grafik için henüz başvuru verisi bulunmuyor.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="applicationTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<DashboardChartTooltip label="Başvuru" />} />
                  <Area
                    type="monotone"
                    dataKey="başvuru"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#applicationTrendFill)"
                    activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="enterprise-panel p-5 xl:col-span-2">
          <div className="mb-5">
            <h2 className="section-title">Departmanlara Göre Başvurular</h2>
            <p className="mt-1 text-xs text-muted-foreground">Aktif başvuruların departman bazında dağılımı</p>
          </div>

          <div className="h-[280px] w-full">
            {departmentChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Departman bazlı başvuru bulunmuyor.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 8, right: 8, left: -18, bottom: 52 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<DashboardChartTooltip label="Başvuru" />} />
                  <Bar dataKey="başvuru" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={46} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline distribution */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Aşama Dağılımı
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Adayların aşama bazında dağılımı
              </p>
            </div>
          </div>

          {/* Stage bars */}
          <div className="space-y-4">
            {!data?.stageDistribution || data.stageDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Henüz aktif süreç aşaması bulunmuyor.</p>
            ) : (
              data.stageDistribution.map((stage, i) => {
                const maxCount = Math.max(
                  ...data.stageDistribution.map((s) => s.candidateCount),
                  1
                );
                const widthPct = (stage.candidateCount / maxCount) * 100;
                return (
                  <div key={stage.stageId} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 text-[10px] font-mono font-semibold text-muted-foreground">
                          {stage.displayOrder}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {stage.stageName}
                        </span>
                      </div>
                      <span className="font-mono text-sm text-muted-foreground">
                        {stage.candidateCount} aday
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500 ease-out group-hover:from-primary group-hover:to-primary/80"
                        style={{
                          width: `${widthPct}%`,
                          transitionDelay: `${i * 80}ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Status summary */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Süreç Özeti
          </h2>
          <div className="space-y-4">
            <StatusRow
              icon={CheckCircle2}
              label="İşe Alındı"
              count={stats.hiredCount}
              total={stats.totalProcesses}
              color="text-primary"
              barColor="bg-primary"
            />
            <StatusRow
              icon={Clock}
              label="Aktif Süreç"
              count={stats.activeCount}
              total={stats.totalProcesses}
              color="text-chart-2"
              barColor="bg-chart-2"
            />
            <StatusRow
              icon={PauseCircle}
              label="Beklemede"
              count={stats.onHoldCount}
              total={stats.totalProcesses}
              color="text-chart-3"
              barColor="bg-chart-3"
            />
            <StatusRow
              icon={XCircle}
              label="Reddedildi"
              count={stats.rejectedCount}
              total={stats.totalProcesses}
              color="text-destructive"
              barColor="bg-destructive"
            />
          </div>

          {/* Hire rate circle */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">İşe Alım Oranı</span>
              <span className="font-mono text-2xl font-bold text-primary">
                {stats.hireRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "500ms" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Son Aday Girişleri
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sisteme en son eklenen adaylar
            </p>
          </div>
          <Link
            href="/adaylar"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Tüm Adaylar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-2">
          {recentCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Henüz eklenmiş bir aday bulunmuyor.</p>
          ) : (
            recentCandidates.map((d) => {
              const { candidate, processes } = d;
              const process = processes?.[0]; // most recent process
              return (
                <Link
                  key={candidate.id}
                  href={`/adaylar/${candidate.id}`}
                  className="flex items-center gap-4 rounded-xl p-3 hover:bg-accent/50 transition-all duration-200 group"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/5 text-primary font-display font-semibold text-sm">
                    {candidate.firstName?.[0]}
                    {candidate.lastName?.[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {candidate.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {process?.positionTitle || "Başvurulmadı"} {candidate.currentJobTitle ? `· ${candidate.currentJobTitle}` : ""}
                    </p>
                  </div>

                  {/* Stage badge */}
                  {process && (
                    <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-chart-2 bg-chart-2/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {process.currentStageName}
                    </div>
                  )}

                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{payload[0]?.payload?.label || payload[0]?.payload?.name}</p>
      <p className="text-sm font-semibold text-foreground">
        {label}: <span className="font-mono text-primary">{payload[0].value}</span>
      </p>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  count,
  total,
  color,
  barColor,
}: {
  icon: any;
  label: string;
  count: number;
  total: number;
  color: string;
  barColor: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-sm text-foreground">{label}</span>
        </div>
        <span className="font-mono text-sm text-muted-foreground">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
