import "server-only";
import { db } from "../db";
import { sha256 } from "../auth";

/** Odszukanie eksportu po tokenie z linku (porównanie hashy, sprawdzenie ważności). */
export async function exportByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const ex = await db.export.findUnique({ where: { shareTokenHash: sha256(token) }, include: { editingProject: { include: { project: { include: { client: true } } } } } });
  if (!ex || !ex.shareExpiresAt || ex.shareExpiresAt < new Date()) return null;
  return ex;
}
