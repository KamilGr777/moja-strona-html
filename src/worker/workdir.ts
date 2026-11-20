import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Katalog roboczy zadania (usuwany po zakończeniu). Ścieżki bez znaków specjalnych dla FFmpeg. */
export async function withWorkdir<T>(name: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `drai-${safe}-`));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
