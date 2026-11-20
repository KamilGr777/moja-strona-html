"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Trash2, Sun, Moon, CheckCircle2, XCircle, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge, Notice } from "@/components/ui/misc";
import { api } from "@/lib/client/api";

interface Integration {
  ai: { enabled: boolean; model: string };
  transcription: { enabled: boolean; provider: string; model: string };
  storage: { driver: string };
  musicLibrary: { configured: boolean };
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">{ok ? <CheckCircle2 className="mt-0.5 size-4 text-good" /> : <XCircle className="mt-0.5 size-4 text-warn" />}<div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted">{detail}</p></div></li>
  );
}

export function SettingsApp({ name: initialName, email, retentionDays, integrations, usage, templates, theme }: { name: string; email: string; retentionDays: number; integrations: Integration; usage: Array<{ kind: string; count: number; units: number }>; templates: Array<{ id: string; name: string; client: string | null; colors: string[] }>; theme: "dark" | "light" }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [ret, setRet] = useState(retentionDays);
  const [tpl, setTpl] = useState(templates);
  const USAGE_LABEL: Record<string, string> = { ai_analysis: "Analizy AI (tokeny)", ai_chat: "Czat AI (tokeny)", ai_ideas: "Pomysły AI (tokeny)" };
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold">Profil</h2>
        <Field label="Imię lub nazwa"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="E-mail"><Input value={email} disabled /></Field>
        <Field label="Automatyczne usuwanie projektów (dni)" hint="RODO: projekty nieaktualizowane dłużej niż wskazana liczba dni są usuwane wraz z materiałami (0 = nigdy).">
          <Input type="number" min={0} max={3650} value={ret} onChange={(e) => setRet(Number(e.target.value))} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => { await api("/api/settings", { method: "PATCH", body: { name, retentionDays: ret } }); toast.success("Zapisano ustawienia."); router.refresh(); }}><Save /> Zapisz</Button>
          <Button variant="secondary" onClick={() => { document.cookie = `drai-theme=${theme === "dark" ? "light" : "dark"}; path=/; max-age=31536000; samesite=lax`; router.refresh(); }}>{theme === "dark" ? <><Sun /> Jasny motyw</> : <><Moon /> Ciemny motyw</>}</Button>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Integracje</h2>
        <p className="mb-2 text-xs text-muted">Klucze API konfigurujesz w pliku <code>.env</code> na serwerze — nie są wyświetlane w aplikacji.</p>
        <ul className="divide-y divide-border">
          <Row ok={integrations.ai.enabled} label="Analiza multimodalna AI (Claude)" detail={integrations.ai.enabled ? `Model: ${integrations.ai.model}` : "Brak ANTHROPIC_API_KEY — aplikacja działa w trybie heurystycznym (pomiary techniczne)."} />
          <Row ok={integrations.transcription.enabled} label="Transkrypcja mowy (PL)" detail={integrations.transcription.enabled ? `${integrations.transcription.provider} · ${integrations.transcription.model}` : "TRANSCRIPTION_PROVIDER=none — mowa nie jest rozpoznawana."} />
          <Row ok label="Silnik wideo (FFmpeg)" detail="Analiza scen, metadanych, audio i render MP4 (H.264 + AAC, napisy libass)." />
          <Row ok label="Storage" detail={integrations.storage.driver === "s3" ? "Zgodny z S3" : "Lokalny katalog (development)"} />
          <Row ok={integrations.musicLibrary.configured} label="Biblioteka muzyki" detail={integrations.musicLibrary.configured ? "MUSIC_LIBRARY_DIR skonfigurowany" : "Opcjonalnie: MUSIC_LIBRARY_DIR z licencjonowaną muzyką"} />
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Użycie (ostatnie 30 dni)</h2>
        {usage.length ? <ul className="space-y-1.5 text-sm">{usage.map((u) => <li key={u.kind} className="flex justify-between"><span className="text-muted">{USAGE_LABEL[u.kind] ?? u.kind}</span><span className="tabular">{u.count} zapytań · {u.units.toLocaleString("pl-PL")}</span></li>)}</ul> : <p className="text-sm text-muted">Brak zapytań do płatnych API.</p>}
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><LayoutTemplate className="size-4 text-primary" /> Szablony marki</h2>
        {tpl.length ? (
          <ul className="space-y-1.5">{tpl.map((t) => <li key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"><span className="flex gap-0.5">{t.colors.slice(0, 3).map((c) => <span key={c} className="size-3 rounded-full" style={{ background: c }} />)}</span><span className="flex-1 truncate">{t.name}</span>{t.client && <Badge>{t.client}</Badge>}<button onClick={async () => { await api(`/api/brand-templates/${t.id}`, { method: "DELETE" }); setTpl((x) => x.filter((y) => y.id !== t.id)); }} className="text-subtle hover:text-bad" aria-label="Usuń szablon"><Trash2 className="size-3.5" /></button></li>)}</ul>
        ) : <p className="text-sm text-muted">Szablony zapisujesz w edytorze (zakładka Szablony).</p>}
      </Card>
      <Card className="border-bad/30 p-5 xl:col-span-2">
        <h2 className="mb-1 text-sm font-semibold text-bad">Usuwanie danych (RODO)</h2>
        <Notice tone="bad" className="my-3">Operacje są nieodwracalne — usuwają oryginalne nagrania, analizy, montaże, eksporty i linki do akceptacji.</Notice>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={async () => { if (!confirm("Usunąć WSZYSTKIE materiały i projekty? Konto pozostanie.")) return; await api("/api/settings/data", { method: "DELETE", body: { deleteAccount: false } }); toast.success("Dane usunięte."); router.push("/"); router.refresh(); }}><Trash2 /> Usuń wszystkie materiały i projekty</Button>
          <Button variant="ghost" onClick={async () => { if (!confirm("Usunąć konto i wszystkie dane?")) return; await api("/api/settings/data", { method: "DELETE", body: { deleteAccount: true } }); router.push("/register"); router.refresh(); }}>Usuń konto</Button>
        </div>
      </Card>
    </div>
  );
}
