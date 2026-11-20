"use client";
import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileVideo, FileAudio, ImageIcon, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { uploadFile, type UploadParams } from "@/lib/client/api";
import { Progress } from "@/components/ui/misc";

export interface UploadedAsset {
  id: string;
  originalName: string;
}

interface Item {
  key: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const ACCEPT: Record<string, string> = {
  video: "video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.m4v,.mkv",
  audio: "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac",
  image: "image/png,image/jpeg,image/webp",
};

export function Uploader({
  params,
  accept = "video",
  multiple = false,
  onUploaded,
  title,
  hint,
  compact,
  disabled,
}: {
  params: UploadParams | (() => Promise<UploadParams>);
  accept?: "video" | "audio" | "image";
  multiple?: boolean;
  onUploaded?: (asset: UploadedAsset) => void;
  title?: string;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = useCallback(
    async (files: File[]) => {
      if (disabled || !files.length) return;
      const list = multiple ? files : files.slice(0, 1);
      const p = typeof params === "function" ? await params() : params;
      const newItems = list.map((f) => ({ key: `${f.name}-${f.size}-${Math.random()}`, file: f, progress: 0, status: "uploading" as const }));
      setItems((cur) => [...(multiple ? cur : []), ...newItems]);
      // max 3 równoległe uploady
      const queue = [...newItems];
      const worker = async () => {
        while (queue.length) {
          const it = queue.shift()!;
          try {
            const { asset } = await uploadFile(it.file, it.file.name, p, (f) => setItems((cur) => cur.map((x) => (x.key === it.key ? { ...x, progress: f } : x))));
            setItems((cur) => cur.map((x) => (x.key === it.key ? { ...x, progress: 1, status: "done" } : x)));
            onUploaded?.(asset);
          } catch (e) {
            setItems((cur) => cur.map((x) => (x.key === it.key ? { ...x, status: "error", error: (e as Error).message } : x)));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, newItems.length) }, worker));
    },
    [disabled, multiple, params, onUploaded],
  );

  const Icon = accept === "audio" ? FileAudio : accept === "image" ? ImageIcon : FileVideo;
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void start(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-center transition",
          compact ? "px-4 py-5" : "px-6 py-10",
          drag ? "border-primary bg-primary/8" : "border-border-strong bg-surface-2/50 hover:border-primary/60 hover:bg-surface-2",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className={cn("mb-3 flex items-center justify-center rounded-2xl border border-border bg-surface transition group-hover:scale-105", compact ? "size-10" : "size-14")}>
          <UploadCloud className={cn("text-primary", compact ? "size-5" : "size-7")} />
        </div>
        <p className="text-sm font-medium">{title ?? (multiple ? "Przeciągnij pliki tutaj lub kliknij, aby wybrać" : "Przeciągnij plik tutaj lub kliknij, aby wybrać")}</p>
        <p className="mt-1 text-xs text-subtle">{hint ?? (accept === "video" ? "MP4, MOV, WebM, MKV · do kilku GB" : accept === "audio" ? "MP3, WAV, M4A, AAC, FLAC" : "PNG, JPG, WebP")}</p>
        <input ref={inputRef} type="file" className="hidden" accept={ACCEPT[accept]} multiple={multiple} onChange={(e) => { void start(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
              <Icon className="size-4 shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{it.file.name}</span>
                  <span className="shrink-0 text-subtle">{formatBytes(it.file.size)}</span>
                </div>
                {it.status === "uploading" && <Progress value={it.progress * 100} className="mt-1.5" />}
                {it.status === "error" && <p className="mt-0.5 text-xs text-bad">{it.error}</p>}
              </div>
              {it.status === "done" && <CheckCircle2 className="size-4 text-good" />}
              {it.status === "error" && <AlertCircle className="size-4 text-bad" />}
              {it.status !== "uploading" && (
                <button className="text-subtle hover:text-fg" onClick={() => setItems((c) => c.filter((x) => x.key !== it.key))} aria-label="Ukryj"><X className="size-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
