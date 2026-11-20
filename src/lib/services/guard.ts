import "server-only";
import { db } from "../db";
import { HttpError } from "../http";

export async function ownedProject(userId: string, id: string) {
  const p = await db.project.findFirst({ where: { id, userId } });
  if (!p) throw new HttpError(404, "Nie znaleziono projektu.");
  return p;
}

export async function ownedAsset(userId: string, id: string) {
  const a = await db.mediaAsset.findFirst({ where: { id, userId } });
  if (!a) throw new HttpError(404, "Nie znaleziono pliku.");
  return a;
}

export async function ownedEditing(userId: string, id: string) {
  const ep = await db.editingProject.findFirst({ where: { id, project: { userId } }, include: { project: { include: { client: true } } } });
  if (!ep) throw new HttpError(404, "Nie znaleziono projektu montażowego.");
  return ep;
}

export async function ownedClient(userId: string, id: string) {
  const c = await db.client.findFirst({ where: { id, userId } });
  if (!c) throw new HttpError(404, "Nie znaleziono klienta.");
  return c;
}

export async function ownedAnalysis(userId: string, id: string) {
  const a = await db.analysis.findFirst({ where: { id, project: { userId } } });
  if (!a) throw new HttpError(404, "Nie znaleziono analizy.");
  return a;
}
