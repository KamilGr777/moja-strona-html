"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Redo2, Play, Pause, SkipBack, Scissors, Trash2, Copy, Eye, EyeOff, Download, Loader2, Check, CloudOff, Clapperboard, Film } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { JobProgress } from "@/components/jobs/job-progress";
import { api, ApiError } from "@/lib/client/api";
import { clampToDuration, duplicateItem, removeItem, splitAt, totalDuration } from "@/lib/timeline/ops";
import { mapSourceRange } from "@/lib/timeline/mapping";
import type { TimelineDoc } from "@/lib/timeline/types";
import { formatTimecode } from "@/lib/utils";
import { useEditorState, type EditorAsset } from "./state";
import { Preview, type PreviewHandle } from "./preview";
import { Timeline, type Marker } from "./timeline";
import { Inspector } from "./inspector";
import { LeftPanel, type EditorContext } from "./left-panel";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export function EditorApp({ name, initialDoc, initialRevision, initialAssets, ctx }: { name: string; initialDoc: TimelineDoc; initialRevision: number; initialAssets: EditorAsset[]; ctx: EditorContext }) {
  const router = useRouter();
  const ed = useEditorState(initialDoc);
  const { doc } = ed;
  const [assetsList, setAssetsList] = useState(initialAssets);
  const assets = useMemo(() => Object.fromEntries(assetsList.map((a) => [a.id, a])), [assetsList]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSafe, setShowSafe] = useState(true);
  const [save, setSave] = useState<SaveState>("saved");
  const [title, setTitle] = useState(name);
  const [previewJob, setPreviewJob] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);
  const revision = useRef(initialRevision);
  const firstVersion = useRef(ed.version);
  const preview = useRef<PreviewHandle>(null);
  const total = totalDuration(doc);

  // ── autosave (debounce) ──
  useEffect(() => {
    if (ed.version === firstVersion.current || ed.dragging) return;
    setSave("dirty");
    const h = setTimeout(async () => {
      setSave("saving");
      try {
        const r = await api<{ revision: number }>(`/api/editing/${ctx.editingId}`, { method: "PUT", body: { doc, revision: revision.current }, silent: true });
        revision.current = r.revision;
        setSave("saved");
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) setSave("conflict");
        else setSave("error");
      }
    }, 1200);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.version, ed.dragging]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save === "dirty" || save === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  // ── odświeżanie listy plików w trakcie przetwarzania ──
  const refreshAssets = useCallback(async () => {
    const r = await api<{ assets: EditorAsset[] }>(`/api/editing/${ctx.editingId}/assets`, { method: "GET", silent: true }).catch(() => null);
    if (r) setAssetsList(r.assets);
  }, [ctx.editingId]);
  useEffect(() => {
    if (!assetsList.some((a) => a.status === "UPLOADED" || a.status === "PROCESSING")) return;
    const h = setInterval(refreshAssets, 2500);
    return () => clearInterval(h);
  }, [assetsList, refreshAssets]);

  const seek = useCallback((t: number) => {
    const c = Math.max(0, Math.min(total, t));
    setTime(c);
    preview.current?.seek(c);
  }, [total]);

  // ── skróty klawiszowe ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === "Space") { e.preventDefault(); preview.current?.toggle(); }
      else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); ed.undo(); }
      else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); ed.redo(); }
      else if (mod && e.key.toLowerCase() === "d" && selected) { e.preventDefault(); ed.apply((d) => duplicateItem(d, selected)); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selected) { e.preventDefault(); ed.apply((d) => clampToDuration(removeItem(d, selected))); setSelected(null); }
      else if (e.key.toLowerCase() === "s" && !mod) { e.preventDefault(); ed.apply((d) => splitAt(d, time)); }
      else if (e.key === "ArrowLeft") seek(time - (e.shiftKey ? 1 : 1 / doc.settings.fps));
      else if (e.key === "ArrowRight") seek(time + (e.shiftKey ? 1 : 1 / doc.settings.fps));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ed, selected, time, seek, doc.settings.fps]);

  // ── znaczniki uwag AI przeniesione na oś montażu ──
  const markers: Marker[] = useMemo(() => {
    if (!ctx.analysis) return [];
    return ctx.analysis.findings.flatMap((f) => mapSourceRange(doc, ctx.analysis!.assetId, f.start, f.end).map((r, k) => ({ id: `${f.id}-${k}`, start: r.start, end: r.end, severity: f.severity, label: f.problem ?? f.suggestion })));
  }, [ctx.analysis, doc]);

  async function renderPreview() {
    if (save !== "saved") {
      toast.info("Poczekaj na zapisanie zmian…");
      return;
    }
    const r = await api<{ jobId: string; renderJobId: string }>(`/api/editing/${ctx.editingId}/render`, { body: { preview: true, quality: "draft" } });
    setPreviewAsset(null);
    setPreviewJob(r.jobId);
  }

  async function rename(v: string) {
    setTitle(v);
    if (v.trim()) await api(`/api/editing/${ctx.editingId}`, { method: "PUT", body: { doc, revision: revision.current, name: v.trim() }, silent: true }).then((r) => (revision.current = (r as { revision: number }).revision)).catch(() => undefined);
  }

  const SaveIcon = { saved: Check, dirty: Loader2, saving: Loader2, error: CloudOff, conflict: CloudOff }[save];
  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh">
      {/* Pasek górny */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-elevated px-3 py-2">
        <Button asChild variant="ghost" size="icon-sm"><Link href="/editor" aria-label="Wróć"><ArrowLeft /></Link></Button>
        <Clapperboard className="size-4 text-primary" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={(e) => rename(e.target.value)} className="h-8 min-w-0 max-w-[260px] flex-1 rounded-md bg-transparent px-2 text-sm font-semibold outline-none hover:bg-surface-2 focus:bg-surface-2" aria-label="Nazwa projektu" />
        <span className={`flex items-center gap-1 text-xs ${save === "error" || save === "conflict" ? "text-bad" : "text-subtle"}`}>
          <SaveIcon className={`size-3.5 ${save === "saving" || save === "dirty" ? "animate-spin" : ""}`} />
          {save === "saved" ? "Zapisano" : save === "dirty" ? "Zmiany…" : save === "saving" ? "Zapisywanie…" : save === "conflict" ? "Konflikt wersji" : "Błąd zapisu"}
        </span>
        {save === "conflict" && <Button size="sm" variant="secondary" onClick={() => router.refresh()}>Wczytaj najnowszą</Button>}
        <div className="ml-auto flex items-center gap-1">
          <Tooltip content="Cofnij (Ctrl+Z)"><Button variant="ghost" size="icon-sm" onClick={ed.undo} disabled={!ed.canUndo} aria-label="Cofnij"><Undo2 /></Button></Tooltip>
          <Tooltip content="Ponów (Ctrl+Shift+Z)"><Button variant="ghost" size="icon-sm" onClick={ed.redo} disabled={!ed.canRedo} aria-label="Ponów"><Redo2 /></Button></Tooltip>
          <Button variant="secondary" size="sm" onClick={renderPreview}><Film /> Podgląd renderu</Button>
          <Button size="sm" asChild><Link href={`/export/${ctx.editingId}`}><Download /> Eksport</Link></Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[300px_1fr_320px]">
        <aside className="order-3 min-h-0 min-w-0 rounded-xl border border-border bg-surface p-3 lg:order-1 lg:overflow-hidden">
          <LeftPanel doc={doc} assets={assets} apply={ed.apply} time={time} ctx={ctx} onAssetsChanged={refreshAssets} selectedId={selected} />
        </aside>
        <section className="order-1 flex min-h-0 min-w-0 flex-col gap-3 lg:order-2">
          <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-xl border border-border bg-[radial-gradient(circle_at_center,#141824,#0a0b0e)] p-3">
            <Preview ref={preview} doc={doc} assets={assets} time={time} onTime={setTime} onPlayingChange={setPlaying} showSafe={showSafe} selectedId={selected} onSelect={setSelected} onMoveText={(id, x, y, commit) => ed.apply((d) => ({ ...d, texts: d.texts.map((t) => (t.id === id ? { ...t, position: { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 } } : t)) }), !commit)} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Button variant="ghost" size="icon-sm" onClick={() => seek(0)} aria-label="Na początek"><SkipBack /></Button>
            <Button size="icon" onClick={() => preview.current?.toggle()} aria-label={playing ? "Pauza" : "Odtwórz"}>{playing ? <Pause /> : <Play />}</Button>
            <span className="w-28 text-center text-xs tabular text-muted">{formatTimecode(time)} / {formatTimecode(total)}</span>
            <Tooltip content="Podziel w miejscu głowicy (S)"><Button variant="ghost" size="icon-sm" onClick={() => ed.apply((d) => splitAt(d, time))} aria-label="Podziel"><Scissors /></Button></Tooltip>
            <Tooltip content="Duplikuj (Ctrl+D)"><Button variant="ghost" size="icon-sm" disabled={!selected} onClick={() => selected && ed.apply((d) => duplicateItem(d, selected))} aria-label="Duplikuj"><Copy /></Button></Tooltip>
            <Tooltip content="Usuń (Delete)"><Button variant="ghost" size="icon-sm" disabled={!selected} onClick={() => { if (selected) { ed.apply((d) => clampToDuration(removeItem(d, selected))); setSelected(null); } }} aria-label="Usuń"><Trash2 /></Button></Tooltip>
            <Tooltip content="Bezpieczne strefy platformy"><Button variant={showSafe ? "secondary" : "ghost"} size="icon-sm" onClick={() => setShowSafe((s) => !s)} aria-label="Strefy">{showSafe ? <Eye /> : <EyeOff />}</Button></Tooltip>
          </div>
          <Timeline doc={doc} assets={assets} time={time} onSeek={seek} selectedId={selected} onSelect={setSelected} apply={ed.apply} commit={ed.commit} markers={markers} />
        </section>
        <aside className="order-2 min-h-0 overflow-y-auto rounded-xl border border-border bg-surface p-4 lg:order-3">
          <Inspector doc={doc} selectedId={selected} assets={assets} apply={ed.apply} commit={ed.commit} time={time} onSelect={setSelected} />
        </aside>
      </div>

      <Dialog open={Boolean(previewJob)} onOpenChange={(o) => !o && setPreviewJob(null)}>
        <DialogContent title="Podgląd renderu" description="Rzeczywisty render FFmpeg w niższej rozdzielczości (540×960) — dokładnie tak, jak w eksporcie.">
          {previewAsset ? (
            <video src={`/api/media/${previewAsset}?v=proxy`} controls autoPlay playsInline className="mx-auto max-h-[70vh] rounded-xl bg-black" />
          ) : previewJob ? (
            <JobProgress jobId={previewJob} title="Renderowanie podglądu" onDone={async (j) => {
              if (j.status === "COMPLETED") {
                const res = (j.result ?? (await api<{ job: { result: { assetId: string } } }>(`/api/jobs/${j.id}`, { method: "GET" })).job.result) as { assetId: string };
                setPreviewAsset(res.assetId);
              }
            }} onRetried={setPreviewJob} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
