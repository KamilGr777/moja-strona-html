import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { HttpError, json, readJson, route } from "@/lib/http";
import { ownedProject } from "@/lib/services/guard";
import { generateMontages } from "@/lib/services/montage";

const Body = z.object({ only: z.enum(["MAIN", "VARIANTS"]).optional(), patch: z.record(z.string(), z.unknown()).optional() });

/** Ponowne ułożenie montażu z już przeanalizowanych klipów (bez ponownej analizy AI). */
export const POST = route(async (req, ctx: { params: Promise<{ projectId: string }> }) => {
  const user = await requireApiUser();
  const { projectId } = await ctx.params;
  const project = await ownedProject(user.id, projectId);
  const body = Body.parse(await readJson(req));
  if (!project.montageSettings) throw new HttpError(409, "Najpierw wygeneruj montaż.");
  if (body.patch) await db.project.update({ where: { id: projectId }, data: { montageSettings: { ...(project.montageSettings as object), ...body.patch } as Prisma.InputJsonValue } });
  try {
    const ids = await generateMontages(projectId, { only: body.only });
    return json({ editingProjectIds: ids });
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
});
