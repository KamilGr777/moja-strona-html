"use client";
import { useRef, useState } from "react";
import { Send, Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { applyOps, type EditOp } from "@/lib/timeline/ops";
import type { AssetMap, TimelineDoc } from "@/lib/timeline/types";
import { cn } from "@/lib/utils";
import type { EditorAsset } from "./state";

interface Msg {
  role: "user" | "assistant";
  content: string;
  operations?: EditOp[];
  summary?: string[];
  cannotDo?: string | null;
  mode?: string;
  applied?: boolean;
  dismissed?: boolean;
  warning?: string;
}

const EXAMPLES = ["Skróć tę rolkę do 15 sekund.", "Zrób bardziej luksusową wersję.", "Dodaj mocniejszy początek.", "Usuń najnudniejsze fragmenty.", "Dodaj napisy zachęcające do kontaktu.", "Który fragment najlepiej nadaje się na początek?", "Co powinienem jeszcze dograć?"];

export function ChatPanel({ editingId, doc, assets, apply }: { editingId: string; doc: TimelineDoc; assets: Record<string, EditorAsset>; apply: (fn: (d: TimelineDoc) => TimelineDoc) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const assetMap: AssetMap = Object.fromEntries(Object.values(assets).map((a) => [a.id, { id: a.id, durationSec: a.durationSec, hasAudio: a.hasAudio, width: a.width, height: a.height, kind: a.kind }]));

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = msgs.map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await api<{ reply: string; operations: EditOp[]; summary: string[]; cannotDo: string | null; mode: string; warning?: string }>(`/api/editing/${editingId}/chat`, { body: { message: text, doc, history } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply, operations: r.operations, summary: r.summary, cannotDo: r.cannotDo, mode: r.mode, warning: r.warning }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Nie udało się uzyskać odpowiedzi. Spróbuj ponownie." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function applyMsg(i: number) {
    const m = msgs[i];
    if (!m.operations?.length) return;
    let errors: string[] = [];
    apply((d) => {
      const r = applyOps(d, m.operations!, assetMap);
      errors = r.errors;
      return r.doc;
    });
    setMsgs((all) => all.map((x, j) => (j === i ? { ...x, applied: true, warning: errors.length ? `Pominięto: ${errors.join("; ")}` : x.warning } : x)));
  }

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl border border-border bg-surface-2/50">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Sparkles className="size-4 text-primary" />
        <span className="text-xs font-semibold">Asystent montażysty</span>
      </div>
      <div className="max-h-[46vh] min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!msgs.length && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted">Napisz, co zmienić. Asystent zna projekt, analizę klipów i profil klienta.</p>
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => send(e)} className="block w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-xs text-muted transition hover:border-primary/50 hover:text-fg">{e}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("rounded-xl px-3 py-2 text-xs leading-relaxed", m.role === "user" ? "ml-6 bg-primary/15 text-fg" : "mr-2 border border-border bg-surface")}>
            {m.mode === "rules" && <Badge className="mb-1">tryb prostych poleceń (bez AI)</Badge>}
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.cannotDo && <p className="mt-2 rounded-md bg-warn/10 px-2 py-1 text-warn">{m.cannotDo}</p>}
            {m.warning && <p className="mt-2 text-[11px] text-subtle">{m.warning}</p>}
            {m.summary && m.summary.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-surface-2 p-2">
                <p className="mb-1 font-semibold">Proponowane zmiany:</p>
                <ul className="space-y-0.5 text-muted">{m.summary.map((s, k) => <li key={k}>• {s}</li>)}</ul>
                {!m.applied && !m.dismissed ? (
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" onClick={() => applyMsg(i)}><Check /> Zastosuj zmiany</Button>
                    <Button size="sm" variant="ghost" onClick={() => setMsgs((all) => all.map((x, j) => (j === i ? { ...x, dismissed: true } : x)))}><X /> Odrzuć</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-subtle">{m.applied ? "✓ Zastosowano (możesz cofnąć: Ctrl+Z)" : "Odrzucono"}</p>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="flex items-center gap-2 text-xs text-muted"><Loader2 className="size-3.5 animate-spin" /> Analizuję projekt…</p>}
        <div ref={endRef} />
      </div>
      <form className="flex gap-1.5 border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="np. Skróć do 15 sekund" className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 text-xs outline-none focus:border-primary/60" maxLength={1000} />
        <Button size="icon-sm" type="submit" disabled={busy || !input.trim()} aria-label="Wyślij"><Send /></Button>
      </form>
    </div>
  );
}
