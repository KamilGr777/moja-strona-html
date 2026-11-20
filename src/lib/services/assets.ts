import { db } from "../db";
import { storage, assetPrefix } from "../storage";

/** Trwałe usunięcie pliku (oryginał + pochodne) i rekordu. */
export async function deleteAsset(assetId: string, userId: string) {
  const a = await db.mediaAsset.findFirst({ where: { id: assetId, userId } });
  if (!a) return false;
  await storage().deletePrefix(assetPrefix(userId, a.id)).catch(() => undefined);
  await db.mediaAsset.delete({ where: { id: a.id } });
  return true;
}

/** Usunięcie projektu wraz ze wszystkimi materiałami, analizami, montażami i eksportami (RODO). */
export async function deleteProjectCompletely(projectId: string, userId: string) {
  const p = await db.project.findFirst({ where: { id: projectId, userId }, include: { assets: true } });
  if (!p) return false;
  for (const a of p.assets) await storage().deletePrefix(assetPrefix(userId, a.id)).catch(() => undefined);
  await db.project.delete({ where: { id: p.id } });
  return true;
}
