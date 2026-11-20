import Link from "next/link";
import { Clapperboard, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Thumb } from "@/components/common/thumb";
import { NewEditingButton } from "@/components/editor/new-editing-button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Edytor wideo" };

const VARIANT: Record<string, string> = { VIRAL: "Wersja A — Viral", PREMIUM: "Wersja B — Premium", SALES: "Wersja C — Sales", FIXED: "Poprawiona przez AI", AUTO: "AI Auto Montaż", MANUAL: "Ręczny" };

export default async function EditorList() {
  const user = await requireUser();
  const [items, videos] = await Promise.all([
    db.editingProject.findMany({
      where: { project: { userId: user.id } },
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: { project: { select: { name: true, thumbnailAssetId: true, client: { select: { name: true } } } }, tracks: { where: { type: "VIDEO" }, include: { items: { take: 1, orderBy: { order: "asc" } } } }, _count: { select: { exports: true } } },
    }),
    db.mediaAsset.findMany({ where: { userId: user.id, kind: "VIDEO", status: "READY", role: { in: ["RAW_CLIP", "SOURCE_REEL"] } }, orderBy: { createdAt: "desc" }, take: 60, select: { id: true, originalName: true, durationSec: true } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Edytor" title="Edytor wideo" description="Wielościeżkowa timeline w przeglądarce: przycinanie, kolejność, napisy, muzyka, logo i rzeczywisty render MP4." actions={<NewEditingButton videos={videos} />} />
      {items.length === 0 ? (
        <EmptyState icon={Clapperboard} title="Brak projektów montażowych" description="Utwórz montaż z nagrań w bibliotece, z AI Auto Montażu albo z raportu analizy." action={<NewEditingButton videos={videos} />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((e) => {
            const thumb = e.tracks[0]?.items[0]?.assetId ?? e.project.thumbnailAssetId;
            return (
              <Link key={e.id} href={`/editor/${e.id}`}>
                <Card className="flex gap-4 p-3 transition hover:border-border-strong">
                  <Thumb assetId={thumb} className="h-[104px] w-[60px] shrink-0" />
                  <div className="min-w-0 flex-1 py-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="truncate text-xs text-subtle">{e.project.name}{e.project.client ? ` · ${e.project.client.name}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="primary">{VARIANT[e.variant] ?? e.variant}</Badge>
                      {e._count.exports > 0 && <Badge tone="good">{e._count.exports} eksport(y)</Badge>}
                    </div>
                    <p className="mt-2 text-[11px] text-subtle">Zmieniono {formatDate(e.updatedAt)}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-subtle"><Plus className="size-3.5" /> Skróty: Spacja — odtwarzanie, S — podziel, Delete — usuń, Ctrl+Z / Ctrl+Shift+Z — cofnij / ponów, Ctrl+D — duplikuj.</p>
    </div>
  );
}
