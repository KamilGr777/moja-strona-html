"use client";
import { useRef, useState } from "react";
import { CheckCircle2, MessageSquarePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge, Notice } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { formatTimecode } from "@/lib/utils";

interface Comment { id: string; authorName: string; body: string; timeSec: number | null; kind: string; createdAt: string }

export function ReviewApp({ token, title, studio, comments: initial, status: initialStatus }: { token: string; title: string; studio: string | null; comments: Comment[]; status: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [comments, setComments] = useState(initial);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [atTime, setAtTime] = useState(true);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  async function send(kind: "comment" | "approval" | "changes") {
    if (!name.trim()) return alert("Podaj imię.");
    setBusy(true);
    try {
      const r = await api<{ comment: Comment }>(`/api/review/${token}/comments`, { body: { authorName: name, body, kind, timeSec: atTime && video.current ? Math.round(video.current.currentTime * 10) / 10 : null } });
      setComments((c) => [r.comment, ...c]);
      setBody("");
      if (kind === "approval") setStatus("approved");
      if (kind === "changes") setStatus("changes_requested");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Akceptacja rolki{studio ? ` · ${studio}` : ""}</p>
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      {status === "approved" && <Notice tone="good" className="mb-4">Projekt został zaakceptowany. Dziękujemy!</Notice>}
      {status === "changes_requested" && <Notice tone="warn" className="mb-4">Wysłano prośbę o poprawki — twórca otrzymał Twoje uwagi.</Notice>}
      <div className="grid gap-6 md:grid-cols-[minmax(260px,380px)_1fr]">
        <video ref={video} src={`/api/review/${token}/video`} controls playsInline className="aspect-[9/16] w-full rounded-2xl bg-black" />
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <Field label="Twoje imię"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
            <Field label="Komentarz"><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder="np. Proszę skrócić pierwsze ujęcie" /></Field>
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={atTime} onChange={(e) => setAtTime(e.target.checked)} /> Przypnij komentarz do aktualnego momentu filmu</label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" loading={busy} disabled={!body.trim()} onClick={() => send("comment")}><MessageSquarePlus /> Dodaj komentarz</Button>
              <Button size="sm" loading={busy} onClick={() => send("approval")}><CheckCircle2 /> Akceptuję projekt</Button>
              <Button size="sm" variant="outline" loading={busy} onClick={() => send("changes")}><RotateCcw /> Proszę o poprawki</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Komentarze</h2>
            {comments.length ? (
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="font-semibold text-fg">{c.authorName}</span>
                      {c.timeSec != null && <button onClick={() => { if (video.current) video.current.currentTime = c.timeSec!; }} className="text-primary hover:underline">{formatTimecode(c.timeSec)}</button>}
                      {c.kind === "approval" && <Badge tone="good">akceptacja</Badge>}
                      {c.kind === "changes" && <Badge tone="warn">poprawki</Badge>}
                    </div>
                    {c.body}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Brak komentarzy.</p>}
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-subtle">Prywatny podgląd przygotowany w DETAIL REEL AI. Link jest ważny ograniczony czas.</p>
    </div>
  );
}
