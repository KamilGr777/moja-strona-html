"use client";
import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge, Notice } from "@/components/ui/misc";
import { api } from "@/lib/client/api";

interface Copy { instagram: string; cta: string; hashtags: string[]; tiktok: string; source: string; warning?: string }

export function PostCopy({ editingId }: { editingId: string }) {
  const [data, setData] = useState<Copy | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = (t: string) => { void navigator.clipboard.writeText(t); toast.success("Skopiowano."); };
  return (
    <div className="space-y-3">
      <Button size="sm" loading={busy} onClick={async () => { setBusy(true); try { setData(await api<Copy>(`/api/editing/${editingId}/post-copy`, { method: "POST" })); } finally { setBusy(false); } }}><Sparkles /> {data ? "Wygeneruj ponownie" : "Wygeneruj opis posta"}</Button>
      {data && (
        <>
          {data.source === "template" && <Notice tone="warn">{data.warning ? `${data.warning}. ` : ""}Opis z szablonu (bez AI) — dopasuj go przed publikacją.</Notice>}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">Opis Instagram <button onClick={() => copy(`${data.instagram}\n\n${data.hashtags.map((h) => `#${h}`).join(" ")}`)} className="flex items-center gap-1 text-primary"><Copy className="size-3" /> kopiuj</button></div>
            <Textarea value={data.instagram} onChange={(e) => setData({ ...data, instagram: e.target.value })} rows={6} />
          </div>
          <div className="flex flex-wrap gap-1">{data.hashtags.map((h) => <Badge key={h}>#{h}</Badge>)}</div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">CTA <button onClick={() => copy(data.cta)} className="flex items-center gap-1 text-primary"><Copy className="size-3" /> kopiuj</button></div>
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">{data.cta}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted">Krótki opis TikTok <button onClick={() => copy(data.tiktok)} className="flex items-center gap-1 text-primary"><Copy className="size-3" /> kopiuj</button></div>
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">{data.tiktok}</p>
          </div>
        </>
      )}
    </div>
  );
}
