// Tryb czatu bez AI: rozpoznaje proste polecenia i przygotowuje rzeczywiste operacje na projekcie.
import type { EditOp } from "../timeline/ops";
import { clipDuration, layoutVideo } from "../timeline/ops";
import type { TimelineDoc } from "../timeline/types";
import { formatTimecode, round } from "../utils";

export interface SceneHint {
  assetId: string;
  start: number;
  end: number;
  score: number;
  description?: string | null;
  category?: string | null;
}

export interface ChatReply {
  reply: string;
  operations: EditOp[];
  cannotDo: string | null;
}

export function ruleBasedChat(message: string, doc: TimelineDoc, ctx: { scenes: SceneHint[]; cta?: string | null; missingShots?: string[] }): ChatReply {
  const m = message.toLowerCase();
  const { total, entries } = layoutVideo(doc);
  const ops: EditOp[] = [];
  const num = /(\d+(?:[.,]\d+)?)\s*(?:s|sek|sekund)/.exec(m);

  if (/(skró|skroc|długoś|dlugos|przytnij).*(\d)/.test(m) && num) {
    const sec = Number(num[1].replace(",", "."));
    ops.push({ op: "set_target_duration", seconds: sec });
    return { reply: `Dopasuję długość rolki z ${total.toFixed(1).replace(".", ",")} s do ${sec} s — najpierw skracam najdłuższe ujęcia, zachowując pierwsze ujęcie (hook).`, operations: ops, cannotDo: null };
  }
  if (/nudn|słab|slab|usuń najs|usun najs/.test(m)) {
    const scored = doc.video.map((v) => {
      const s = ctx.scenes.filter((x) => x.assetId === v.assetId && v.sourceIn < x.end && v.sourceOut > x.start);
      return { v, score: s.length ? Math.max(...s.map((x) => x.score)) : 5 };
    });
    const weakest = scored.slice(1, -1).sort((a, b) => a.score - b.score).slice(0, Math.max(1, Math.floor(doc.video.length / 5)));
    weakest.forEach((w) => ops.push({ op: "remove_clip", itemId: w.v.id }));
    return { reply: weakest.length ? `Usunę ${weakest.length} najsłabiej ocenione ujęcia (na podstawie pomiarów ruchu i ostrości). Hook i zakończenie zostają.` : "Projekt ma za mało ujęć, by coś usunąć.", operations: ops, cannotDo: null };
  }
  if (/dynamicz|szybsz|tiktok|viral/.test(m)) {
    doc.video.forEach((v) => {
      const d = clipDuration(v);
      if (d > 1.6) {
        const cut = (d - 1.4) * v.speed;
        ops.push({ op: "trim_clip", itemId: v.id, sourceIn: round(v.sourceIn + cut / 2, 3), sourceOut: round(v.sourceOut - cut / 2, 3) });
      }
      if (v.transition.type !== "cut") ops.push({ op: "set_transition", itemId: v.id, type: "cut", duration: 0 });
    });
    ops.push({ op: "set_caption_style", preset: "bold_viral" });
    return { reply: "Skracam ujęcia do maks. ok. 1,4 s, zamieniam przejścia na czyste cięcia i ustawiam styl napisów Bold Viral.", operations: ops, cannotDo: null };
  }
  if (/luksus|premium|elegan|cinemat/.test(m)) {
    doc.video.forEach((v, i) => {
      if (i > 0 && i % 3 === 0) ops.push({ op: "set_transition", itemId: v.id, type: "fade", duration: 0.35 });
    });
    ops.push({ op: "set_caption_style", preset: "luxury" });
    ops.push({ op: "set_text_animation", animation: "fade" });
    return { reply: "Wersja bardziej luksusowa: styl napisów Luxury Automotive, łagodne przenikania co kilka ujęć i spokojne pojawianie się tekstów.", operations: ops, cannotDo: null };
  }
  if (/hook|początek|poczatek|mocniejsz/.test(m)) {
    const best = [...ctx.scenes].sort((a, b) => b.score - a.score)[0];
    if (!best) return { reply: "Nie mam danych o scenach, aby wybrać nowy początek.", operations: [], cannotDo: null };
    if (/któr|ktor|jaki/.test(m) && !/dodaj|zrób|zrob/.test(m)) {
      return { reply: `Najlepszy kandydat na początek: ${best.description ?? "fragment"} (${formatTimecode(best.start)}–${formatTimecode(best.end)} materiału) — najwyższa ocena atrakcyjności.`, operations: [], cannotDo: null };
    }
    const len = Math.min(1.5, best.end - best.start);
    ops.push({ op: "insert_clip", assetId: best.assetId, sourceIn: best.start, sourceOut: round(best.start + len, 3), index: 0 });
    return { reply: `Dodam na początku najmocniejszy fragment (${formatTimecode(best.start)}–${formatTimecode(best.start + len)}), skrócony do ${len.toFixed(1).replace(".", ",")} s.`, operations: ops, cannotDo: null };
  }
  if (/napis|cta|kontakt|rezerw|umów|umow/.test(m)) {
    const cta = ctx.cta?.trim() || "Umów termin już dziś";
    const last = entries[entries.length - 1];
    ops.push({ op: "add_text", text: cta, start: round(Math.max(0, (last?.start ?? total - 2) + 0.1), 2), end: round(total, 2), kind: "cta" });
    return { reply: `Dodam na końcu napis z wezwaniem do działania: „${cta}”.`, operations: ops, cannotDo: null };
  }
  if (/kolejno|ułóż|uloz|zmień kolej|zmien kolej/.test(m)) {
    const order = doc.video
      .map((v) => ({ v, score: Math.max(0, ...ctx.scenes.filter((x) => x.assetId === v.assetId && v.sourceIn < x.end && v.sourceOut > x.start).map((x) => x.score)) }))
      .sort((a, b) => b.score - a.score);
    if (order[0]) ops.push({ op: "move_clip", itemId: order[0].v.id, toIndex: 0 });
    return { reply: "Przeniosę najmocniejsze ujęcie na początek; resztę kolejności zostawiam zgodnie z logiką procesu.", operations: ops, cannotDo: null };
  }
  if (/dogra|nagra|brakuj/.test(m)) {
    return { reply: ctx.missingShots?.length ? `Warto dograć: ${ctx.missingShots.slice(0, 5).join("; ")}.` : "Lista brakujących ujęć jest dostępna w raporcie analizy (moduł „Co warto jeszcze nagrać?”).", operations: [], cannotDo: null };
  }
  if (/instagram|reklam/.test(m)) {
    ops.push({ op: "set_target_duration", seconds: 20 });
    ops.push({ op: "set_caption_style", preset: "clean_modern" });
    const cta = ctx.cta?.trim() || "Umów termin już dziś";
    ops.push({ op: "add_text", text: cta, start: 18, end: 20, kind: "cta" });
    return { reply: "Wersja reklamowa pod Instagram: długość ok. 20 s, czytelne napisy Clean Modern i CTA na końcu.", operations: ops, cannotDo: null };
  }
  return {
    reply: "W trybie bez AI rozumiem proste polecenia: „skróć do 15 sekund”, „zrób bardziej dynamiczną/luksusową wersję”, „dodaj mocniejszy początek”, „usuń najnudniejsze fragmenty”, „dodaj napisy zachęcające do kontaktu”, „zmień kolejność ujęć”, „który fragment na początek?”, „co dograć?”.",
    operations: [],
    cannotDo: "Pełne rozumienie dowolnych poleceń wymaga skonfigurowania klucza AI (ANTHROPIC_API_KEY).",
  };
}
