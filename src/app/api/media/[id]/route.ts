import { requireApiUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { ownedAsset } from "@/lib/services/guard";
import { streamFile } from "@/lib/services/stream";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/** Bezpieczne serwowanie plików użytkownika (tylko właściciel; klucze storage nie są ujawniane). */
export const GET = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const a = await ownedAsset(user.id, id);
  const url = new URL(req.url);
  const v = url.searchParams.get("v") ?? "proxy";
  const download = url.searchParams.get("download") === "1";
  const meta = (a.metadata ?? {}) as { lastFrameKey?: string };
  switch (v) {
    case "original":
      return streamFile(req, a.storageKey, a.mimeType, download ? { filename: a.originalName } : {});
    case "proxy":
      return streamFile(req, a.proxyKey ?? a.storageKey, a.kind === "IMAGE" ? "image/png" : a.proxyKey ? "video/mp4" : a.mimeType, download ? { filename: a.originalName } : {});
    case "poster":
      if (!a.posterKey) throw new HttpError(404, "Brak miniatury.");
      return streamFile(req, a.posterKey, a.posterKey.endsWith(".png") ? "image/png" : "image/jpeg", { cache: "private, max-age=86400" });
    case "last":
      if (!meta.lastFrameKey) throw new HttpError(404, "Brak klatki.");
      return streamFile(req, meta.lastFrameKey, "image/jpeg");
    case "sprite":
      if (!a.spriteKey) throw new HttpError(404, "Brak paska miniatur.");
      return streamFile(req, a.spriteKey, "image/jpeg", { cache: "private, max-age=86400" });
    case "waveform": {
      if (!a.waveformKey) throw new HttpError(404, "Brak waveformu.");
      const buf = await storage().readBuffer(a.waveformKey);
      return new Response(new Uint8Array(buf), { headers: { "content-type": "application/json", "cache-control": "private, max-age=86400" } });
    }
    default:
      throw new HttpError(400, "Nieznany wariant pliku.");
  }
});
