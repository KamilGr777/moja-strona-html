import Link from "next/link";
import { History } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge, ScorePill } from "@/components/common/status";
import { Thumb } from "@/components/common/thumb";
import { PROJECT_TYPE_LABELS } from "@/lib/constants";
import { projectHref } from "@/lib/project-links";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Historia projektów" };

const TYPES = [["", "Wszystkie"], ["ANALYSIS", "Analizy"], ["AUTO_MONTAGE", "Auto montaż"], ["EDIT", "Montaż ręczny"]] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const type = TYPES.some(([t]) => t === sp.type) ? sp.type : "";
  const projects = await db.project.findMany({
    where: { userId: user.id, ...(type ? { type: type as "ANALYSIS" } : {}), ...(sp.q ? { name: { contains: sp.q, mode: "insensitive" } } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { client: { select: { name: true } }, analyses: { where: { parentAnalysisId: null }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, totalScore: true, mode: true } }, assets: { where: { kind: "VIDEO" }, take: 1, select: { id: true } }, _count: { select: { editingProjects: true } } },
  });
  return (
    <div>
      <PageHeader eyebrow="Historia" title="Historia projektów" description="Wszystkie analizy, montaże i eksporty w jednym miejscu." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TYPES.map(([t, label]) => (
          <Link key={t} href={`/projects${t ? `?type=${t}` : ""}`} className={`rounded-lg border px-3 py-1.5 text-xs ${type === t ? "border-primary/50 bg-primary/12 text-fg" : "border-border text-muted hover:text-fg"}`}>{label}</Link>
        ))}
        <form className="ml-auto" action="/projects"><input name="q" defaultValue={sp.q} placeholder="Szukaj projektu…" className="h-8 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/60" />{type && <input type="hidden" name="type" value={type} />}</form>
      </div>
      {projects.length === 0 ? <EmptyState icon={History} title="Brak projektów" /> : (
        <Card>
          <ul className="divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={projectHref(p)} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                  <Thumb assetId={p.thumbnailAssetId ?? p.assets[0]?.id} className="h-14 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-subtle">{PROJECT_TYPE_LABELS[p.type]} · {p.client?.name ?? "Bez klienta"} · {p._count.editingProjects} montaży</p>
                  </div>
                  <ScorePill score={p.analyses[0]?.totalScore} scaled={p.analyses[0]?.mode === "HEURISTIC"} />
                  <StatusBadge status={p.status} />
                  <span className="hidden w-36 text-right text-xs text-subtle md:block">{formatDate(p.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
