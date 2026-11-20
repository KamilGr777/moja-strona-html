import { callStructured, imageBlock, textBlock } from "./client";
import { ChatResponseSchema, IdeasSchema, PostCopySchema } from "./schemas";
import { CHAT_SYSTEM, IDEAS_SYSTEM, POST_SYSTEM, clientBlock, type ClientProfile } from "./prompts";
import { EditOpSchema, layoutVideo, type EditOp } from "../timeline/ops";
import type { TimelineDoc, AssetMap } from "../timeline/types";
import { SERVICES, GOALS, MONTAGE_STYLES } from "../constants";
import { round } from "../utils";

export async function chatWithAi(o: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  doc: TimelineDoc;
  assets: AssetMap;
  scenes: Array<{ assetId: string; start: number; end: number; description?: string | null; category?: string | null; score: number }>;
  analysisSummary?: string | null;
  client: ClientProfile | null;
}) {
  const { entries, total } = layoutVideo(o.doc);
  const project = {
    dlugosc_s: round(total, 2),
    klipy: o.doc.video.map((v, i) => ({ itemId: v.id, pozycja: i, assetId: v.assetId, plik: o.assets[v.assetId]?.name, sourceIn: v.sourceIn, sourceOut: v.sourceOut, predkosc: v.speed, start_na_osi: round(entries[i].start, 2), koniec_na_osi: round(entries[i].end, 2), opis: v.label ?? null, przejscie: v.transition.type })),
    napisy: o.doc.texts.map((t) => ({ textId: t.id, tekst: t.text, start: t.start, end: t.end, rodzaj: t.kind })),
    muzyka: o.doc.audio.map((a) => ({ plik: o.assets[a.assetId]?.name, glosnosc: a.volume })),
    styl_napisow: o.doc.settings.captionPreset,
    wyciszony_oryginal: o.doc.settings.muteOriginal,
  };
  const nagrania = Object.values(o.assets).filter((a) => a.kind === "VIDEO").map((a) => ({ assetId: a.id, plik: a.name, dlugosc_s: round(a.durationSec, 2) }));
  const context = `${clientBlock(o.client)}\n\nPROJEKT:\n${JSON.stringify(project)}\n\nDOSTĘPNE NAGRANIA:\n${JSON.stringify(nagrania)}\n\nSCENY (opisy i oceny 0–10):\n${JSON.stringify(o.scenes.slice(0, 80).map((s) => ({ ...s, start: round(s.start, 2), end: round(s.end, 2), score: round(s.score, 1) })))}${o.analysisSummary ? `\n\nPODSUMOWANIE ANALIZY: ${o.analysisSummary}` : ""}`;
  const historyText = o.history.slice(-8).map((h) => `${h.role === "user" ? "Użytkownik" : "Asystent"}: ${h.content}`).join("\n");
  const res = await callStructured({
    schema: ChatResponseSchema,
    system: CHAT_SYSTEM,
    content: `${context}\n\n${historyText ? `WCZEŚNIEJSZA ROZMOWA:\n${historyText}\n\n` : ""}NOWA PROŚBA UŻYTKOWNIKA: ${o.message}`,
    effort: "medium",
    maxTokens: 16000,
  });
  const operations: EditOp[] = [];
  const rejected: string[] = [];
  // walidacja schematu i referencji (model może podać nieistniejący identyfikator)
  const videoIds = new Set(o.doc.video.map((v) => v.id));
  const textIds = new Set(o.doc.texts.map((t) => t.id));
  for (const op of res.data.operations) {
    const p = EditOpSchema.safeParse(op);
    if (!p.success) {
      rejected.push(op.op);
      continue;
    }
    const d = p.data;
    const badRef =
      ("itemId" in d && !videoIds.has(d.itemId)) ||
      ("textId" in d && !textIds.has(d.textId)) ||
      (d.op === "insert_clip" && !o.assets[d.assetId]);
    if (badRef) rejected.push(op.op);
    else operations.push(d);
  }
  return { reply: res.data.reply, operations, cannotDo: res.data.cannotDo, rejected, usage: res.usage };
}

export async function ideasWithAi(o: { service: string; goal: string; car?: string | null; style: string; durationSec: number; footage: string; client: ClientProfile | null }) {
  const res = await callStructured({
    schema: IdeasSchema,
    system: IDEAS_SYSTEM,
    content: `Usługa: ${SERVICES[o.service as keyof typeof SERVICES] ?? o.service}\nCel filmu: ${GOALS[o.goal as keyof typeof GOALS] ?? o.goal}\nSamochód: ${o.car || "nie podano"}\nStyl: ${MONTAGE_STYLES[o.style as keyof typeof MONTAGE_STYLES] ?? o.style}\nDocelowa długość: ${o.durationSec} s\nMateriał: ${o.footage === "new" ? "można dograć nowe ujęcia" : "wyłącznie już nagrane ujęcia typowe dla tej usługi"}\n\n${clientBlock(o.client)}\n\nWygeneruj 10 pomysłów.`,
    effort: "medium",
    maxTokens: 32000,
  });
  return res;
}

export async function postCopyWithAi(o: { service: string | null; client: ClientProfile | null; summary?: string | null; captions: string[]; poster?: Buffer | null }) {
  const content = [
    textBlock(`Usługa: ${o.service ? SERVICES[o.service as keyof typeof SERVICES] ?? o.service : "nie podano"}\n${clientBlock(o.client)}\nNapisy w rolce: ${o.captions.join(" | ") || "brak"}\n${o.summary ? `Opis materiału: ${o.summary}` : ""}`),
    ...(o.poster ? [textBlock("Kadr z rolki:"), imageBlock(o.poster)] : []),
  ];
  return callStructured({ schema: PostCopySchema, system: POST_SYSTEM, content, effort: "low", maxTokens: 8000 });
}
