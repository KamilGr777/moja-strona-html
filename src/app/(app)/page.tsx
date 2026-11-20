import Link from "next/link";
import { ScanSearch, Wand2, Lightbulb, FolderClock, ArrowRight, Film, Gauge, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/env";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/misc";
import { StatusBadge, ScorePill } from "@/components/common/status";
import { Thumb } from "@/components/common/thumb";
import { formatDate, formatDuration } from "@/lib/utils";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";
import { projectHref } from "@/lib/project-links";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const [analyzed, avg, exportsCount, needsWork, recent] = await Promise.all([
    db.analysis.count({ where: { project: { userId: user.id }, status: "COMPLETED", parentAnalysisId: null } }),
    db.analysis.aggregate({ where: { project: { userId: user.id }, status: "COMPLETED" }, _avg: { totalScore: true } }),
    db.export.count({ where: { editingProject: { project: { userId: user.id } } } }),
    db.project.count({ where: { userId: user.id, status: { in: ["NEEDS_WORK", "CHANGES_REQUESTED"] } } }),
    db.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        client: { select: { name: true } },
        analyses: { where: { parentAnalysisId: null }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, totalScore: true, technical: true, asset: { select: { durationSec: true } } } },
        assets: { where: { kind: "VIDEO" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true, durationSec: true } },
      },
    }),
  ]);
  const last = recent[0];
  const stats = [
    { label: "Przeanalizowane rolki", value: analyzed, icon: ScanSearch, tone: "text-primary" },
    { label: "Średnia ocena filmów", value: avg._avg.totalScore != null ? Math.round(avg._avg.totalScore) : "—", suffix: avg._avg.totalScore != null ? "/100" : "", icon: Gauge, tone: "text-accent" },
    { label: "Ukończone montaże", value: exportsCount, icon: CheckCircle2, tone: "text-good" },
    { label: "Projekty do poprawy", value: needsWork, icon: AlertTriangle, tone: "text-warn" },
  ];
  const actions = [
    { href: "/analysis", title: "Przeanalizuj gotową rolkę", desc: "Ocena 0–100, uwagi sekunda po sekundzie, poprawki", icon: ScanSearch, accent: "from-[#3d7bff]/25" },
    { href: "/montage", title: "Stwórz rolkę z surowych nagrań", desc: "AI Auto Montaż i trzy warianty A/B/C", icon: Wand2, accent: "from-[#22d3ee]/25" },
    { href: "/ideas", title: "Wygeneruj pomysł na film", desc: "Scenariusz, shot lista, napisy i muzyka", icon: Lightbulb, accent: "from-[#f5b638]/20" },
    { href: last ? projectHref(last) : "/projects", title: "Otwórz ostatni projekt", desc: last ? last.name : "Brak projektów", icon: FolderClock, accent: "from-[#a78bfa]/20", disabled: !last },
  ];

  return (
    <div>
      <PageHeader eyebrow="Dashboard" title={`Cześć, ${user.name.split(" ")[0]}`} description="Przesyłaj nagrania, otrzymuj ekspercką ocenę i twórz rolki, które pokazują wartość usług detailingowych." />
      {!aiEnabled() && (
        <Notice tone="warn" title="Tryb heurystyczny" className="mb-6">
          Klucz API modelu AI nie jest skonfigurowany. Analiza obejmuje rzeczywiste pomiary techniczne (cięcia, ruch, ostrość, jasność, audio, tempo), ale nie interpretuje treści obrazu. Ustaw <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code> w pliku .env, aby włączyć pełną analizę AI.
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">{s.label}</p>
              <s.icon className={`size-4 ${s.tone}`} />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular sm:text-3xl">
              {s.value}
              {s.suffix && <span className="ml-1 text-sm font-normal text-subtle">{s.suffix}</span>}
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Szybkie akcje</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.title} href={a.href} aria-disabled={a.disabled} className={`group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-border-strong ${a.disabled ? "pointer-events-none opacity-50" : ""}`}>
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.accent} to-transparent opacity-60 transition group-hover:opacity-100`} />
            <div className="relative">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-border bg-surface-2"><a.icon className="size-5 text-fg" /></div>
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{a.desc}</p>
              <ArrowRight className="absolute right-0 top-0 size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Ostatnie projekty</h2>
        <Link href="/projects" className="text-xs text-primary hover:underline">Wszystkie projekty</Link>
      </div>
      {recent.length === 0 ? (
        <EmptyState icon={Sparkles} title="Zacznij od pierwszej rolki" description="Prześlij gotową rolkę do analizy albo surowe nagrania do automatycznego montażu." action={<Link href="/analysis" className="text-sm text-primary hover:underline">Przeanalizuj rolkę →</Link>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[64px_1.2fr_1.6fr_90px_130px_90px_150px] gap-4 border-b border-border px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-subtle md:grid">
            <span>Podgląd</span><span>Klient</span><span>Film</span><span>Długość</span><span>Status</span><span>Ocena AI</span><span>Utworzono</span>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((p) => {
              const thumbId = p.thumbnailAssetId ?? p.assets[0]?.id;
              const dur = p.analyses[0]?.asset?.durationSec ?? p.assets[0]?.durationSec;
              const scaled = (p.analyses[0]?.technical as { totalScaled?: boolean } | null)?.totalScaled;
              return (
                <li key={p.id}>
                  <Link href={projectHref(p)} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-surface-2 md:grid-cols-[64px_1.2fr_1.6fr_90px_130px_90px_150px] md:gap-4 md:px-5">
                    <Thumb assetId={thumbId} className="aspect-[9/16] h-[72px] w-[44px] md:h-[80px] md:w-[46px]" />
                    <span className="hidden truncate text-sm text-muted md:block">{p.client?.name ?? "—"}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-subtle">{PROJECT_TYPE_LABELS[p.type]}{p.client ? <span className="md:hidden"> · {p.client.name}</span> : null}</span>
                    </span>
                    <span className="hidden text-sm tabular text-muted md:block">{formatDuration(dur)}</span>
                    <span className="hidden md:block"><StatusBadge status={p.status} /></span>
                    <span><ScorePill score={p.analyses[0]?.totalScore} scaled={scaled} /></span>
                    <span className="hidden text-xs text-subtle md:block">{formatDate(p.createdAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-subtle"><Film className="size-3.5" /> Oceny są ekspercką prognozą jakości kreatywnej, a nie gwarancją wyświetleń czy sprzedaży.</p>
    </div>
  );
}
