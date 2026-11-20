import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, json, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { exportByToken } from "@/lib/services/review";

const Body = z.object({
  authorName: z.string().trim().min(1, "Podaj imię.").max(80),
  body: z.string().trim().max(2000).default(""),
  timeSec: z.number().min(0).max(36000).nullish(),
  kind: z.enum(["comment", "approval", "changes"]).default("comment"),
});

export const POST = route(async (req, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  await rateLimit(`review:${token.slice(0, 12)}:${req.headers.get("x-forwarded-for") ?? "local"}`, 60, 3600, "komentarzy");
  const ex = await exportByToken(token);
  if (!ex) throw new HttpError(404, "Link wygasł lub jest nieprawidłowy.");
  const body = Body.parse(await readJson(req));
  if (body.kind === "comment" && !body.body) throw new HttpError(400, "Treść komentarza jest pusta.");
  const comment = await db.clientComment.create({
    data: { exportId: ex.id, authorName: body.authorName, body: body.body || (body.kind === "approval" ? "Akceptuję projekt." : "Proszę o poprawki."), timeSec: body.timeSec ?? null, kind: body.kind },
  });
  if (body.kind !== "comment") {
    await db.export.update({ where: { id: ex.id }, data: { reviewStatus: body.kind === "approval" ? "approved" : "changes_requested", reviewedAt: new Date() } });
    await db.project.update({ where: { id: ex.editingProject.projectId }, data: { status: body.kind === "approval" ? "APPROVED" : "CHANGES_REQUESTED" } });
  }
  return json({ comment }, { status: 201 });
});
