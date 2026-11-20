import type { Prisma } from "@prisma/client";
import { db } from "../db";
import {
  TimelineDocSchema,
  TimelineSettingsSchema,
  DEFAULT_SETTINGS,
  type TimelineDoc,
  type VideoItem,
  type AudioItem,
  type LogoItem,
  type BlurRegion,
  type TextItem,
} from "../timeline/types";

/** Odczyt dokumentu timeline z tabel TimelineTrack / TimelineItem / Subtitle. */
export async function loadDoc(editingProjectId: string): Promise<{ doc: TimelineDoc; revision: number }> {
  const ep = await db.editingProject.findUniqueOrThrow({
    where: { id: editingProjectId },
    include: { tracks: { include: { items: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } }, subtitles: { orderBy: { order: "asc" } } },
  });
  const settings = TimelineSettingsSchema.parse({ ...DEFAULT_SETTINGS, ...(ep.settings as object) });
  const doc: TimelineDoc = { version: 1, settings, video: [], audio: [], texts: [], logos: [], blurs: [] };
  for (const track of ep.tracks) {
    for (const it of track.items) {
      const p = (it.props ?? {}) as Record<string, unknown>;
      if (track.type === "VIDEO") {
        doc.video.push({
          id: it.id,
          assetId: it.assetId!,
          sourceIn: it.sourceIn,
          sourceOut: it.sourceOut,
          speed: it.speed,
          volume: it.volume,
          fadeIn: it.fadeIn,
          fadeOut: it.fadeOut,
          crop: (p.crop as VideoItem["crop"]) ?? { x: 0.5, y: 0.5, zoom: 1 },
          transition: (p.transition as VideoItem["transition"]) ?? { type: "cut", duration: 0 },
          ...(p.label ? { label: String(p.label) } : {}),
          ...(p.note ? { note: String(p.note) } : {}),
          ...(p.role ? { role: String(p.role) } : {}),
        });
      } else if (track.type === "AUDIO") {
        doc.audio.push({
          id: it.id,
          assetId: it.assetId!,
          start: it.start,
          sourceIn: it.sourceIn,
          sourceOut: it.sourceOut,
          volume: it.volume,
          fadeIn: it.fadeIn,
          fadeOut: it.fadeOut,
          ...(p.label ? { label: String(p.label) } : {}),
        } satisfies AudioItem);
      } else if (track.type === "LOGO") {
        doc.logos.push({
          id: it.id,
          assetId: it.assetId!,
          start: it.start,
          end: it.start + (it.sourceOut - it.sourceIn),
          position: (p.position as LogoItem["position"]) ?? { x: 0.5, y: 0.85 },
          width: Number(p.width ?? 0.3),
          opacity: Number(p.opacity ?? 1),
        });
      } else if (track.type === "EFFECT") {
        doc.blurs.push({ id: it.id, start: it.start, end: it.start + (it.sourceOut - it.sourceIn), ...(p as Omit<BlurRegion, "id" | "start" | "end">) });
      }
    }
  }
  doc.texts = ep.subtitles.map(
    (s) =>
      ({
        id: s.id,
        kind: s.kind as TextItem["kind"],
        text: s.text,
        start: s.start,
        end: s.end,
        style: s.style as TextItem["style"],
        position: s.position as TextItem["position"],
        animation: s.animation as TextItem["animation"],
        ...(s.words ? { words: s.words as TextItem["words"] } : {}),
        ...((s.style as Record<string, unknown>)?.__anchor ? { anchor: (s.style as Record<string, unknown>).__anchor as TextItem["anchor"] } : {}),
      }) as TextItem,
  );
  // usuń pole techniczne z obiektu stylu
  doc.texts.forEach((t) => delete (t.style as Record<string, unknown>).__anchor);
  return { doc: TimelineDocSchema.parse(doc), revision: ep.revision };
}

/** Zapis dokumentu (pełna podmiana w transakcji) z kontrolą wersji (optimistic concurrency). */
export async function saveDoc(editingProjectId: string, input: TimelineDoc, expectedRevision?: number) {
  const doc = TimelineDocSchema.parse(input);
  return db.$transaction(async (tx) => {
    const ep = await tx.editingProject.findUniqueOrThrow({ where: { id: editingProjectId } });
    if (expectedRevision !== undefined && ep.revision !== expectedRevision) {
      return { ok: false as const, revision: ep.revision };
    }
    await tx.timelineTrack.deleteMany({ where: { editingProjectId } });
    await tx.subtitle.deleteMany({ where: { editingProjectId } });
    const mk = (type: "VIDEO" | "AUDIO" | "LOGO" | "EFFECT", order: number) => tx.timelineTrack.create({ data: { editingProjectId, type, order } });
    const [tv, ta, tl, te] = await Promise.all([mk("VIDEO", 0), mk("AUDIO", 1), mk("LOGO", 2), mk("EFFECT", 3)]);
    const items: Prisma.TimelineItemCreateManyInput[] = [
      ...doc.video.map((v, i) => ({
        id: v.id, trackId: tv.id, order: i, assetId: v.assetId, start: 0, sourceIn: v.sourceIn, sourceOut: v.sourceOut, speed: v.speed, volume: v.volume, fadeIn: v.fadeIn, fadeOut: v.fadeOut,
        props: { crop: v.crop, transition: v.transition, label: v.label, note: v.note, role: v.role } as Prisma.InputJsonValue,
      })),
      ...doc.audio.map((a, i) => ({
        id: a.id, trackId: ta.id, order: i, assetId: a.assetId, start: a.start, sourceIn: a.sourceIn, sourceOut: a.sourceOut, volume: a.volume, fadeIn: a.fadeIn, fadeOut: a.fadeOut,
        props: { label: a.label } as Prisma.InputJsonValue,
      })),
      ...doc.logos.map((l, i) => ({
        id: l.id, trackId: tl.id, order: i, assetId: l.assetId, start: l.start, sourceIn: 0, sourceOut: l.end - l.start,
        props: { position: l.position, width: l.width, opacity: l.opacity } as Prisma.InputJsonValue,
      })),
      ...doc.blurs.map((b, i) => ({
        id: b.id, trackId: te.id, order: i, start: b.start, sourceIn: 0, sourceOut: b.end - b.start,
        props: { x: b.x, y: b.y, w: b.w, h: b.h, strength: b.strength, label: b.label } as Prisma.InputJsonValue,
      })),
    ];
    // identyfikatory elementów są globalne — usuwamy ewentualne kolizje z innych projektów (duplikaty)
    if (items.length) await tx.timelineItem.createMany({ data: items });
    if (doc.texts.length)
      await tx.subtitle.createMany({
        data: doc.texts.map((t, i) => ({
          id: t.id, editingProjectId, order: i, kind: t.kind, start: t.start, end: t.end, text: t.text,
          words: (t.words ?? undefined) as Prisma.InputJsonValue | undefined,
          style: { ...t.style, ...(t.anchor ? { __anchor: t.anchor } : {}) } as Prisma.InputJsonValue,
          position: t.position as Prisma.InputJsonValue,
          animation: t.animation,
        })),
      });
    const updated = await tx.editingProject.update({
      where: { id: editingProjectId },
      data: { settings: doc.settings as Prisma.InputJsonValue, revision: { increment: 1 } },
    });
    return { ok: true as const, revision: updated.revision };
  });
}

/** Kopia dokumentu z nowymi identyfikatorami (np. duplikowanie wariantu). */
export function cloneDocWithNewIds(doc: TimelineDoc, mkId: (p: string) => string): TimelineDoc {
  const idMap = new Map<string, string>();
  const video = doc.video.map((v) => {
    const id = mkId("v");
    idMap.set(v.id, id);
    return { ...v, id };
  });
  return {
    ...doc,
    video,
    audio: doc.audio.map((a) => ({ ...a, id: mkId("a") })),
    texts: doc.texts.map((t) => ({ ...t, id: mkId("t"), ...(t.anchor ? { anchor: { ...t.anchor, itemId: idMap.get(t.anchor.itemId) ?? t.anchor.itemId } } : {}) })),
    logos: doc.logos.map((l) => ({ ...l, id: mkId("l") })),
    blurs: doc.blurs.map((b) => ({ ...b, id: mkId("b") })),
  };
}
