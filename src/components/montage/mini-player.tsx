"use client";
import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Preview, type PreviewHandle } from "@/components/editor/preview";
import type { EditorAsset } from "@/components/editor/state";
import type { TimelineDoc } from "@/lib/timeline/types";
import { totalDuration } from "@/lib/timeline/ops";
import { formatTimecode } from "@/lib/utils";

/** Podgląd wariantu montażu w przeglądarce (bez renderu) — ten sam silnik co w edytorze. */
export function MiniPlayer({ doc, assets }: { doc: TimelineDoc; assets: Record<string, EditorAsset> }) {
  const ref = useRef<PreviewHandle>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = totalDuration(doc);
  return (
    <div>
      <div className="h-[420px]">
        <Preview ref={ref} doc={doc} assets={assets} time={time} onTime={setTime} onPlayingChange={setPlaying} showSafe={false} selectedId={null} onSelect={() => undefined} onMoveText={() => undefined} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => ref.current?.toggle()} className="flex size-8 items-center justify-center rounded-full bg-primary text-white" aria-label={playing ? "Pauza" : "Odtwórz"}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
        <input type="range" min={0} max={total} step={0.01} value={time} onChange={(e) => ref.current?.seek(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" aria-label="Pozycja" />
        <span className="w-20 text-right text-[11px] tabular text-muted">{formatTimecode(time)}/{formatTimecode(total)}</span>
      </div>
    </div>
  );
}
