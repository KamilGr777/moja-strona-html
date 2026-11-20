import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/app-shell";
import { IdeasApp, type IdeaRow } from "@/components/ideas/ideas-app";

export const metadata = { title: "Generator pomysłów" };

export default async function IdeasPage() {
  const user = await requireUser();
  const [clients, saved] = await Promise.all([
    db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.contentIdea.findMany({ where: { userId: user.id, saved: true }, orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="AI Content Ideas" title="Generator pomysłów" description="Nie masz pomysłu na rolkę? Wybierz usługę i cel — otrzymasz gotowe scenariusze z listą ujęć do nagrania." />
      <IdeasApp clients={clients} saved={saved.map((s) => ({ id: s.id, title: s.title, hook: s.hook, source: s.source, saved: s.saved, projectId: s.projectId, data: s.data as unknown as IdeaRow["data"], client: s.client }))} />
    </div>
  );
}
