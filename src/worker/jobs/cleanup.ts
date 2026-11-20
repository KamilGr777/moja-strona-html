import { db } from "../../lib/db";
import { deleteProjectCompletely } from "../../lib/services/assets";

/** Automatyczne usuwanie projektów starszych niż okres retencji użytkownika (RODO). */
export async function runCleanup() {
  const users = await db.user.findMany({ select: { id: true, retentionDays: true } });
  let removed = 0;
  for (const u of users) {
    if (u.retentionDays <= 0) continue;
    const cutoff = new Date(Date.now() - u.retentionDays * 86400_000);
    const old = await db.project.findMany({ where: { userId: u.id, updatedAt: { lt: cutoff } }, select: { id: true } });
    for (const p of old) if (await deleteProjectCompletely(p.id, u.id)) removed++;
  }
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return { removedProjects: removed };
}
