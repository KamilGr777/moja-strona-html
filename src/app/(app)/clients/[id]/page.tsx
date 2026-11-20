import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanSearch, Wand2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { ClientForm, type ClientData } from "@/components/clients/client-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, ScorePill } from "@/components/common/status";
import { projectHref } from "@/lib/project-links";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Profil klienta" };

const EMPTY: ClientData = { name: "", location: null, phone: null, instagram: null, website: null, brandColors: [], communicationStyle: null, targetAudience: null, services: [], advantages: [], preferredReelStyle: null, defaultCta: null, notes: null };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (id === "new") {
    return (
      <div>
        <PageHeader eyebrow="Klienci" title="Nowy klient" description="Profil studia detailingowego używany przez AI przy analizie, montażu i copywritingu." />
        <ClientForm initial={EMPTY} />
      </div>
    );
  }
  const c = await db.client.findFirst({ where: { id, userId: user.id }, include: { projects: { orderBy: { updatedAt: "desc" }, take: 20, include: { analyses: { where: { parentAnalysisId: null }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, totalScore: true } } } } } });
  if (!c) notFound();
  return (
    <div>
      <PageHeader
        eyebrow="Profil klienta"
        title={c.name}
        description={[c.location, c.instagram, c.website].filter(Boolean).join(" · ") || undefined}
        actions={<><Button asChild variant="secondary"><Link href={`/analysis?client=${c.id}`}><ScanSearch /> Analiza rolki</Link></Button><Button asChild><Link href="/montage"><Wand2 /> Auto montaż</Link></Button></>}
      />
      <ClientForm initial={{ ...c }} />
      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Projekty klienta</h2>
      <Card>
        {c.projects.length ? (
          <ul className="divide-y divide-border">
            {c.projects.map((p) => (
              <li key={p.id}><Link href={projectHref(p)} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2"><span className="truncate text-sm">{p.name}</span><span className="flex items-center gap-3"><ScorePill score={p.analyses[0]?.totalScore} /><StatusBadge status={p.status} /><span className="hidden text-xs text-subtle sm:inline">{formatDate(p.updatedAt)}</span></span></Link></li>
            ))}
          </ul>
        ) : <p className="p-5 text-sm text-muted">Brak projektów.</p>}
      </Card>
    </div>
  );
}
