import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser, destroySession } from "@/lib/auth";
import { json, readJson, route } from "@/lib/http";
import { storage } from "@/lib/storage";

/** RODO: usunięcie wszystkich materiałów i projektów (opcjonalnie także konta). */
export const DELETE = route(async (req) => {
  const user = await requireApiUser();
  const { deleteAccount } = z.object({ deleteAccount: z.boolean().default(false) }).parse(await readJson(req));
  await storage().deletePrefix(`u/${user.id}/`).catch(() => undefined);
  if (deleteAccount) {
    await db.user.delete({ where: { id: user.id } });
    await destroySession();
  } else {
    await db.project.deleteMany({ where: { userId: user.id } });
    await db.mediaAsset.deleteMany({ where: { userId: user.id } });
    await db.contentIdea.deleteMany({ where: { userId: user.id } });
    await db.job.deleteMany({ where: { userId: user.id } });
  }
  return json({ ok: true });
});
