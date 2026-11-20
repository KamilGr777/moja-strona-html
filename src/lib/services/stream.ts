import "server-only";
import { Readable } from "node:stream";
import { storage } from "../storage";
import { HttpError } from "../http";

/** Strumieniuje plik ze storage z obsługą nagłówka Range (przewijanie wideo). */
export async function streamFile(req: Request, key: string, contentType: string, opts: { filename?: string; cache?: string } = {}) {
  const st = await storage().stat(key);
  if (!st) throw new HttpError(404, "Plik nie istnieje.");
  const size = st.size;
  const headers: Record<string, string> = {
    "content-type": contentType,
    "accept-ranges": "bytes",
    "cache-control": opts.cache ?? "private, max-age=3600",
    "x-content-type-options": "nosniff",
  };
  if (opts.filename) headers["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(opts.filename)}`;
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? Number(m[1]) : 0;
    let end = m && m[2] ? Number(m[2]) : size - 1;
    if (m && !m[1] && m[2]) {
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    }
    if (start >= size || end >= size || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    const stream = await storage().createReadStream(key, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  const stream = await storage().createReadStream(key);
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers: { ...headers, "content-length": String(size) } });
}
