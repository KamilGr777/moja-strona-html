import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import type { Idea } from "@/lib/analysis/templates";

/** Zamiana pomysłu w projekt auto montażu z checklistą ujęć do nagrania. */
export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const idea = await db.contentIdea.findFirst({ where: { id, userId: user.id } });
  if (!idea) throw new HttpError(404, "Nie znaleziono pomysłu.");
  if (idea.projectId) return json({ projectId: idea.projectId });
  const data = idea.data as unknown as Idea;
  const project = await db.project.create({
    data: {
      userId: user.id,
      clientId: idea.clientId,
      name: idea.title,
      type: "AUTO_MONTAGE",
      service: idea.service,
      goal: idea.goal,
      shotChecklist: data.shotList.map((s) => ({ name: s.shot, done: false, detail: `${s.camera} · ${s.duration}` })) as Prisma.InputJsonValue,
    },
  });
  await db.contentIdea.update({ where: { id }, data: { projectId: project.id, saved: true } });
  return json({ projectId: project.id }, { status: 201 });
});
