import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { daysAgo } from "@/lib/utils";
import { integrationStatus } from "@/lib/env";
import { PageHeader } from "@/components/layout/app-shell";
import { SettingsApp } from "@/components/settings/settings-app";

export const metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  const user = await requireUser();
  const since = daysAgo(30);
  const [usage, templates] = await Promise.all([
    db.usageEvent.groupBy({ by: ["kind"], where: { userId: user.id, createdAt: { gte: since } }, _count: { _all: true }, _sum: { units: true } }),
    db.brandTemplate.findMany({ where: { userId: user.id }, include: { client: { select: { name: true } } } }),
  ]);
  const theme = (await cookies()).get("drai-theme")?.value === "light" ? "light" : "dark";
  return (
    <div>
      <PageHeader eyebrow="Konto" title="Ustawienia" />
      <SettingsApp
        name={user.name}
        email={user.email}
        retentionDays={user.retentionDays}
        integrations={integrationStatus()}
        usage={usage.map((u) => ({ kind: u.kind, count: u._count._all, units: u._sum.units ?? 0 }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, client: t.client?.name ?? null, colors: t.colors }))}
        theme={theme}
      />
    </div>
  );
}
