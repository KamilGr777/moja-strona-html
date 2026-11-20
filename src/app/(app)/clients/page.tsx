import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Moi klienci" };

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, include: { _count: { select: { projects: true } } } });
  return (
    <div>
      <PageHeader eyebrow="Klienci" title="Moi klienci" description="Profile studiów detailingowych — AI automatycznie uwzględnia je w napisach, scenariuszach, CTA i montażu." actions={<Button asChild><Link href="/clients/new"><Plus /> Nowy klient</Link></Button>} />
      {clients.length === 0 ? (
        <EmptyState icon={Users} title="Brak klientów" description="Dodaj pierwsze studio: styl komunikacji, kolory, usługi i domyślne CTA." action={<Button asChild><Link href="/clients/new"><Plus /> Dodaj klienta</Link></Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="h-full p-5 transition hover:border-border-strong">
                <div className="flex items-center gap-3">
                  {c.logoAssetId ? <img src={`/api/media/${c.logoAssetId}?v=proxy`} alt="" className="size-11 rounded-lg bg-surface-2 object-contain p-1" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#3d7bff,#22d3ee)] text-base font-bold text-white">{c.name.slice(0, 1)}</div>}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-subtle">{c.location ?? "—"} · {c._count.projects} projektów</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.brandColors.slice(0, 4).map((col) => <span key={col} className="size-4 rounded-full border border-border" style={{ background: col }} />)}
                  {c.communicationStyle && <Badge>{c.communicationStyle}</Badge>}
                </div>
                {c.services.length > 0 && <p className="mt-3 line-clamp-2 text-xs text-muted">{c.services.join(" · ")}</p>}
                {c.defaultCta && <p className="mt-2 text-xs text-[#8fb4ff]">CTA: „{c.defaultCta}”</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
