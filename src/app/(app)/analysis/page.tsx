import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { NewAnalysisForm } from "@/components/analysis/new-analysis-form";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ScorePill } from "@/components/common/status";
import { Thumb } from "@/components/common/thumb";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata = { title: "Analiza rolek" };

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [clients, analyses] = await Promise.all([
    db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.analysis.findMany({
      where: { project: { userId: user.id }, parentAnalysisId: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { project: { select: { name: true, client: { select: { name: true } } } }, asset: { select: { id: true, durationSec: true } } },
    }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Analiza AI" title="Analiza rolek" description="Prześlij gotową rolkę — system przeanalizuje ją jak doświadczony twórca reklam: hook, ujęcia, przekaz, tempo, CTA i napisy." />
      <NewAnalysisForm clients={clients} defaultClientId={sp.client} />
      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Ostatnie analizy</h2>
      {analyses.length === 0 ? (
        <EmptyState icon={ScanSearch} title="Brak analiz" description="Twoje przeanalizowane rolki pojawią się tutaj." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {analyses.map((a) => (
            <Link key={a.id} href={`/analysis/${a.id}`}>
              <Card className="flex gap-4 p-3 transition hover:border-border-strong">
                <Thumb assetId={a.asset.id} className="h-[104px] w-[60px] shrink-0" />
                <div className="min-w-0 flex-1 py-1">
                  <p className="truncate text-sm font-medium">{a.project.name}</p>
                  <p className="truncate text-xs text-subtle">{a.project.client?.name ?? "Bez klienta"} · {formatDuration(a.asset.durationSec)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {a.status === "COMPLETED" ? <ScorePill score={a.totalScore} scaled={a.mode === "HEURISTIC"} /> : <Badge tone={a.status === "FAILED" ? "bad" : "primary"}>{a.status === "FAILED" ? "Błąd" : a.status === "CANCELLED" ? "Anulowana" : "W toku"}</Badge>}
                    <Badge tone={a.mode === "AI" ? "primary" : "neutral"}>{a.mode === "AI" ? "AI" : "Heurystyka"}</Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-subtle">{formatDate(a.createdAt)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
