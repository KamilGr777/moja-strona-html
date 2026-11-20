// Walidacja typu pliku na podstawie sygnatury (magic bytes), niezależnie od rozszerzenia
// i nagłówka Content-Type deklarowanego przez przeglądarkę.

export type DetectedType = { kind: "VIDEO" | "AUDIO" | "IMAGE"; mime: string; container: string };

export function detectFileType(head: Buffer, filename: string): DetectedType | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const ascii = (start: number, end: number) => head.subarray(start, end).toString("latin1");

  // ISO BMFF (MP4/MOV/M4V/M4A)
  const box = ascii(4, 8);
  if (["ftyp", "moov", "mdat", "wide", "free", "skip"].includes(box)) {
    const brand = ascii(8, 12);
    if (brand.startsWith("M4A") || ext === "m4a") return { kind: "AUDIO", mime: "audio/mp4", container: "m4a" };
    if (brand === "qt  " || ext === "mov") return { kind: "VIDEO", mime: "video/quicktime", container: "mov" };
    return { kind: "VIDEO", mime: "video/mp4", container: "mp4" };
  }
  // Matroska / WebM
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    const isWebm = head.includes(Buffer.from("webm"));
    return { kind: "VIDEO", mime: isWebm ? "video/webm" : "video/x-matroska", container: isWebm ? "webm" : "mkv" };
  }
  if (ascii(0, 4) === "RIFF") {
    const t = ascii(8, 12);
    if (t === "AVI ") return { kind: "VIDEO", mime: "video/x-msvideo", container: "avi" };
    if (t === "WAVE") return { kind: "AUDIO", mime: "audio/wav", container: "wav" };
    if (t === "WEBP") return { kind: "IMAGE", mime: "image/webp", container: "webp" };
  }
  if (ascii(0, 3) === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0 && ext === "mp3")) return { kind: "AUDIO", mime: "audio/mpeg", container: "mp3" };
  if (head[0] === 0xff && (head[1] === 0xf1 || head[1] === 0xf9)) return { kind: "AUDIO", mime: "audio/aac", container: "aac" };
  if (ascii(0, 4) === "OggS") return { kind: "AUDIO", mime: "audio/ogg", container: "ogg" };
  if (ascii(0, 4) === "fLaC") return { kind: "AUDIO", mime: "audio/flac", container: "flac" };
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return { kind: "IMAGE", mime: "image/png", container: "png" };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { kind: "IMAGE", mime: "image/jpeg", container: "jpg" };
  return null;
}
