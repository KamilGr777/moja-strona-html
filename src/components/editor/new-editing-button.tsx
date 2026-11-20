"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { cn, formatDuration } from "@/lib/utils";

export function NewEditingButton({ videos }: { videos: Array<{ id: string; originalName: string; durationSec: number | null }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Nowy montaż");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const r = await api<{ editingProjectId: string }>("/api/editing", { body: { name, assetIds: sel } });
      router.push(`/editor/${r.editingProjectId}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Nowy montaż</Button></DialogTrigger>
      <DialogContent title="Nowy projekt montażowy" description="Wybierz nagrania z biblioteki (kolejność = kolejność zaznaczenia). Możesz też zacząć od pustej timeline i dodać pliki w edytorze.">
        <Field label="Nazwa"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
        <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
          {videos.map((v) => {
            const idx = sel.indexOf(v.id);
            return (
              <li key={v.id}>
                <button onClick={() => setSel((s) => (idx >= 0 ? s.filter((x) => x !== v.id) : [...s, v.id]))} className={cn("flex w-full items-center gap-3 rounded-lg border p-1.5 text-left transition", idx >= 0 ? "border-primary/60 bg-primary/10" : "border-border bg-surface-2 hover:border-border-strong")}>
                  <img src={`/api/media/${v.id}?v=poster`} alt="" className="h-12 w-8 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm">{v.originalName}</span>
                  <span className="text-xs text-subtle">{formatDuration(v.durationSec)}</span>
                  <span className={cn("flex size-5 items-center justify-center rounded-md border text-[11px]", idx >= 0 ? "border-primary bg-primary text-white" : "border-border-strong")}>{idx >= 0 ? idx + 1 : <Check className="size-3 opacity-0" />}</span>
                </button>
              </li>
            );
          })}
          {!videos.length && <p className="text-sm text-muted">Brak przetworzonych nagrań — dodasz je w edytorze.</p>}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Anuluj</Button>
          <Button loading={busy} onClick={create}>Utwórz i otwórz edytor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
