import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { enqueue } from "../queue";
import { saveDoc } from "./timeline-store";
import { emptyDoc, type TimelineDoc } from "../timeline/types";
import { newVideoItem } from "../timeline/ops";
import type { RenderJobOptions } from "../../worker/jobs/render";
import { uid, round } from "../utils";
import type { Transcript } from "../ai/transcribe";
import { CAPTION_PRESETS } from "../timeline/presets";

export async function createEditing(projectId: string, name: string, variant: string, doc: TimelineDoc, changelog?: unknown) {
  const ep = await db.editingProject.create({
    data: { projectId, name, variant, settings: doc.settings as Prisma.InputJsonValue, changelog: (changelog ?? undefined) as Prisma.InputJsonValue | undefined },
  });
  await saveDoc(ep.id, doc);
  return ep;
}

/** Dokument z analizowanej rolki: każda wykryta scena jako osobny klip (łatwa zmiana kolejności). */
export function docFromScenes(o: {
  assetId: string;
  durationSec: number;
  hasAudio: boolean;
  scenes: Array<{ start: number; end: number; description: string | null }>;
  platform: "instagram" | "tiktok" | "youtube";
  transcript?: Transcript | null;
}): TimelineDoc {
  const doc = emptyDoc({ platform: o.platform });
  const scenes = o.scenes.length ? o.scenes : [{ start: 0, end: o.durationSec, description: null }];
  doc.video = scenes.map((s) => newVideoItem(o.assetId, s.start, s.end, { label: s.description ?? undefined }));
  // napisy z transkrypcji (tryb A) — słowa z czasami do podświetlania
  if (o.transcript?.segments.length) {
    const p = CAPTION_PRESETS.bold_viral;
    for (const seg of o.transcript.segments) {
      if (!seg.text.trim()) continue;
      doc.texts.push({
        id: uid("t"),
        kind: "transcript",
        text: seg.text.trim().slice(0, 300),
        start: round(seg.start, 3),
        end: round(Math.max(seg.end, seg.start + 0.4), 3),
        style: { ...p.style, fontSize: 70 },
        position: { x: 0.5, y: 0.66 },
        animation: seg.words.length ? "highlight" : "fade",
        ...(seg.words.length ? { words: seg.words.map((w) => ({ text: w.text, start: w.start, end: w.end })) } : {}),
      });
    }
  }
  return doc;
}

export async function createRender(editingProjectId: string, userId: string, projectId: string, doc: TimelineDoc, options: RenderJobOptions) {
  const rj = await db.renderJob.create({
    data: { editingProjectId, snapshot: doc as unknown as Prisma.InputJsonValue, options: options as unknown as Prisma.InputJsonValue },
  });
  const job = await enqueue("render", { renderJobId: rj.id }, { userId, projectId, stage: options.preview ? "W kolejce: podgląd" : "W kolejce do renderu" });
  return { renderJob: rj, job };
}
