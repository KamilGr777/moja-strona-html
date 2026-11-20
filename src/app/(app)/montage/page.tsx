import Link from "next/link";
import { Wand2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { NewMontageForm } from "@/components/montage/new-montage-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/common/status";
import { Thumb } from "@/components/common/thumb";
import { formatDate } from "@/lib/utils";
import { SERVICES } from "@/lib/constants";

export const metadata = { title: "AI Auto Montaż" };

export default async function MontagePage() {
  const user = await requireUser();
  const [clients, projects] = await Promise.all([
    db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ where: { userId: user.id, type: "AUTO_MONTAGE" }, orderBy: { updatedAt: "desc" }, take: 30, include: { client: { select: { name: true } }, _count: { select: { clips: true, editingProjects: true } }, clips: { take: 1, orderBy: { order: "asc" }, select: { assetId: true } } } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="AI Auto Montaż" title="Stwórz rolkę z surowych nagrań" description="System analizuje wszystkie klipy, wybiera najlepsze momenty, buduje historię i tworzy rzeczywisty montaż — z napisami, muzyką i trzema wariantami do porównania." />
      <NewMontageForm clients={clients} />
      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">Projekty auto montażu</h2>
      {projects.length === 0 ? (
        <EmptyState icon={Wand2} title="Brak projektów" description="Utwórz pierwszy projekt i prześlij surowe klipy." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/montage/${p.id}`}>
              <Card className="flex gap-4 p-3 transition hover:border-border-strong">
                <Thumb assetId={p.thumbnailAssetId ?? p.clips[0]?.assetId} className="h-[104px] w-[60px] shrink-0" />
                <div className="min-w-0 flex-1 py-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-subtle">{p.client?.name ?? "Bez klienta"} · {p.service ? SERVICES[p.service as keyof typeof SERVICES] : "—"}</p>
                  <div className="mt-3 flex items-center gap-2"><StatusBadge status={p.status} /><span className="text-xs text-muted">{p._count.clips} klipów · {p._count.editingProjects} wersji</span></div>
                  <p className="mt-2 text-[11px] text-subtle">{formatDate(p.updatedAt)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
