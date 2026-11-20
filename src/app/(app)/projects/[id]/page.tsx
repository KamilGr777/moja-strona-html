import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanSearch, Clapperboard, Download, MessageSquare, Wand2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Field } from "@/components/ui/input";
import { StatusBadge, ScorePill } from "@/components/common/status";
import { ProjectClientSelect, DeleteProjectButton } from "@/components/common/project-actions";
import { PROJECT_TYPE_LABELS, GOALS, SERVICES, PLATFORMS } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";

export const metadata = { title: "Projekt" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const p = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      client: true,
      analyses: { orderBy: { createdAt: "desc" }, include: { asset: { select: { durationSec: true } } } },
      editingProjects: { orderBy: { createdAt: "asc" }, include: { exports: { orderBy: { createdAt: "desc" }, include: { comments: { orderBy: { createdAt: "desc" } } } } } },
      jobs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!p) notFound();
  const clients = await db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const comments = p.editingProjects.flatMap((e) => e.exports.flatMap((x) => x.comments.map((c) => ({ ...c, ep: e.name }))));
  return (
    <div>
      <PageHeader
        eyebrow={PROJECT_TYPE_LABELS[p.type]}
        title={p.name}
        actions={<>
          {p.type === "AUTO_MONTAGE" && <Button asChild variant="secondary"><Link href={`/montage/${p.id}`}><Wand2 /> Auto montaż</Link></Button>}
          <DeleteProjectButton projectId={p.id} />
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ScanSearch className="size-4 text-primary" /> Analizy</h2>
            {p.analyses.length ? (
              <ul className="divide-y divide-border">
                {p.analyses.map((a) => (
                  <li key={a.id}><Link href={`/analysis/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary">
                    <span>{a.parentAnalysisId ? "Ponowna ocena poprawionej wersji" : "Analiza rolki"} · {formatDuration(a.asset.durationSec)}</span>
                    <span className="flex items-center gap-2"><Badge tone={a.mode === "AI" ? "primary" : "neutral"}>{a.mode === "AI" ? "AI" : "Heurystyka"}</Badge><ScorePill score={a.totalScore} scaled={a.mode === "HEURISTIC"} /><span className="text-xs text-subtle">{formatDate(a.createdAt)}</span></span>
                  </Link></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Brak analiz.</p>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clapperboard className="size-4 text-primary" /> Projekty montażowe i eksporty</h2>
            {p.editingProjects.length ? (
              <ul className="space-y-3">
                {p.editingProjects.map((e) => (
                  <li key={e.id} className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{e.name} <Badge className="ml-1">{e.variant}</Badge></span>
                      <span className="flex gap-2">
                        <Button asChild size="sm" variant="secondary"><Link href={`/editor/${e.id}`}>Edytuj</Link></Button>
                        <Button asChild size="sm"><Link href={`/export/${e.id}`}>Eksport</Link></Button>
                      </span>
                    </div>
                    {e.exports.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted">
                        {e.exports.map((x) => (
                          <li key={x.id} className="flex flex-wrap items-center gap-2">
                            <Download className="size-3.5" /><a href={`/api/exports/${x.id}/download`} className="text-primary hover:underline">MP4 {x.width}×{x.height}</a> · {formatDuration(x.durationSec)} · {formatDate(x.createdAt)}
                            {x.reviewStatus === "approved" && <Badge tone="good">zaakceptowane</Badge>}
                            {x.reviewStatus === "changes_requested" && <Badge tone="warn">poprawki</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Brak projektów montażowych.</p>}
          </Card>
          {comments.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="size-4 text-primary" /> Komentarze klienta</h2>
              <ul className="space-y-2">{comments.map((c) => <li key={c.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"><p className="mb-0.5 text-xs text-muted"><span className="font-semibold text-fg">{c.authorName}</span> · {c.ep}{c.timeSec != null ? ` · ${c.timeSec.toFixed(1)} s` : ""} · {formatDate(c.createdAt)}</p>{c.body}</li>)}</ul>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between"><span className="text-xs text-muted">Status</span><StatusBadge status={p.status} /></div>
            <Field label="Klient"><ProjectClientSelect projectId={p.id} clientId={p.clientId} clients={clients} /></Field>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Cel</dt><dd>{p.goal ? GOALS[p.goal as keyof typeof GOALS] : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Usługa</dt><dd>{p.service ? SERVICES[p.service as keyof typeof SERVICES] : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Platforma</dt><dd>{PLATFORMS[p.platform as keyof typeof PLATFORMS]?.label}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Utworzono</dt><dd>{formatDate(p.createdAt)}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold">Ostatnie zadania</h3>
            <ul className="space-y-1.5 text-xs">{p.jobs.map((j) => <li key={j.id} className="flex justify-between gap-2"><span className="truncate text-muted">{j.type} · {j.stage}</span><Badge tone={j.status === "COMPLETED" ? "good" : j.status === "FAILED" ? "bad" : "primary"}>{j.status}</Badge></li>)}</ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
