"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SwitchRow } from "@/components/ui/switch";
import { api } from "@/lib/client/api";
import { CAPTION_PRESETS } from "@/lib/timeline/presets";

export function FixReelDialog({ open, onOpenChange, analysisId, mode, defaultDuration, maxDuration }: { open: boolean; onOpenChange: (v: boolean) => void; analysisId: string; mode: "full" | "weak-only"; defaultDuration: number; maxDuration: number }) {
  const router = useRouter();
  const [duration, setDuration] = useState(Math.max(5, defaultDuration));
  const [captions, setCaptions] = useState(true);
  const [preset, setPreset] = useState("clean_modern");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await api(`/api/analyses/${analysisId}/fix`, { body: { targetDuration: duration, addCaptions: captions, mode, preset } });
      onOpenChange(false);
      router.refresh();
      setTimeout(() => document.getElementById("before-after")?.scrollIntoView({ behavior: "smooth" }), 400);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={mode === "full" ? "Popraw rolkę z AI" : "Popraw słabe momenty"} description={mode === "full" ? "System przebuduje montaż z Twojego materiału: nowy hook z istniejących ujęć, skrócone długie fragmenty, usunięte słabe ujęcia, optymalna kolejność, napisy i CTA. Powstanie nowa wersja MP4 i ponowna ocena." : "Zachowujemy strukturę rolki — skracamy fragmenty oznaczone na wykresie retencji jako słabe lub ze spadkiem tempa."}>
        <div className="space-y-4">
          <Field label={`Docelowa długość: ${duration} s`} hint={`Maksymalnie ${maxDuration} s (długość oryginału).`}>
            <Slider value={duration} onChange={(v) => setDuration(Math.round(v))} min={5} max={Math.max(6, maxDuration)} step={1} />
          </Field>
          <SwitchRow label="Dodaj napisy i CTA" hint="Napisy marketingowe dopasowane do usługi i profilu klienta" checked={captions} onCheckedChange={setCaptions} />
          {captions && (
            <Field label="Styl napisów">
              <Select value={preset} onValueChange={setPreset} options={Object.entries(CAPTION_PRESETS).map(([value, p]) => ({ value, label: p.label, hint: p.description }))} />
            </Field>
          )}
          <p className="text-xs text-subtle">Nowa ocena po poprawkach to ponowna ekspercka ocena wyrenderowanej wersji — nie jest gwarancją wzrostu statystyk.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Anuluj</Button>
            <Button variant="glow" loading={busy} onClick={run}><Wand2 /> Generuj nową wersję</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
