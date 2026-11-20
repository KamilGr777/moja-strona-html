"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Uploader } from "@/components/media/uploader";
import { api, ApiError } from "@/lib/client/api";
import { STYLE_OPTIONS, SERVICE_OPTIONS } from "@/components/common/option-lists";

export interface ClientData {
  id?: string;
  name: string;
  location: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  brandColors: string[];
  communicationStyle: string | null;
  targetAudience: string | null;
  services: string[];
  advantages: string[];
  preferredReelStyle: string | null;
  defaultCta: string | null;
  notes: string | null;
  logoAssetId?: string | null;
}

function ListInput({ label, values, onChange, placeholder, suggestions }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[] }) {
  const [v, setV] = useState("");
  const add = (x: string) => {
    const t = x.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setV("");
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-2">
        {values.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-xs">{x}<button type="button" onClick={() => onChange(values.filter((y) => y !== x))} aria-label="Usuń"><X className="size-3" /></button></span>
        ))}
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(v); } }} onBlur={() => v && add(v)} placeholder={placeholder} className="min-w-[160px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle" />
      </div>
      {suggestions && (
        <div className="mt-1.5 flex flex-wrap gap-1">{suggestions.filter((s) => !values.includes(s)).map((s) => <button type="button" key={s} onClick={() => add(s)} className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted hover:text-fg"><Plus className="mr-0.5 inline size-3" />{s}</button>)}</div>
      )}
    </Field>
  );
}

export function ClientForm({ initial }: { initial: ClientData }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ClientData>(k: K, v: ClientData[K]) => setC((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const body = { ...c, id: undefined, logoAssetId: undefined };
      if (c.id) {
        await api(`/api/clients/${c.id}`, { method: "PATCH", body });
        toast.success("Zapisano profil klienta.");
        router.refresh();
      } else {
        const r = await api<{ client: { id: string } }>("/api/clients", { body });
        toast.success("Dodano klienta.");
        router.push(`/clients/${r.client.id}`);
      }
    } catch (e) {
      if (e instanceof ApiError) setErrors({ form: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nazwa studia *"><Input value={c.name} onChange={(e) => set("name", e.target.value)} placeholder="np. Diamond Detailing Studio" maxLength={120} /></Field>
          <Field label="Lokalizacja"><Input value={c.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Miasto, dzielnica" /></Field>
          <Field label="Telefon"><Input value={c.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+48 …" /></Field>
          <Field label="Instagram"><Input value={c.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@studio" /></Field>
          <Field label="Strona internetowa"><Input value={c.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Preferowany styl rolek"><Select value={c.preferredReelStyle ?? "none"} onValueChange={(v) => set("preferredReelStyle", v === "none" ? null : v)} options={[{ value: "none", label: "Brak preferencji" }, ...STYLE_OPTIONS.map((o) => ({ value: o.label, label: o.label }))]} /></Field>
        </div>
        <Field label="Kolory marki" hint="Kliknij kolor, aby zmienić; użyjemy ich w napisach, okładkach i szablonach.">
          <div className="flex flex-wrap items-center gap-2">
            {c.brandColors.map((col, i) => (
              <span key={i} className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 pr-2">
                <input type="color" value={col} onChange={(e) => set("brandColors", c.brandColors.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))} className="size-7 rounded" />
                <span className="text-xs tabular">{col}</span>
                <button type="button" onClick={() => set("brandColors", c.brandColors.filter((_, j) => j !== i))} aria-label="Usuń kolor"><X className="size-3 text-subtle" /></button>
              </span>
            ))}
            {c.brandColors.length < 6 && <Button type="button" size="sm" variant="secondary" onClick={() => set("brandColors", [...c.brandColors, "#D4AF37"])}><Plus /> Kolor</Button>}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Styl komunikacji"><Input value={c.communicationStyle ?? ""} onChange={(e) => set("communicationStyle", e.target.value)} placeholder="np. Luxury Premium, rzeczowy, bez emotek" /></Field>
          <Field label="Grupa docelowa"><Input value={c.targetAudience ?? ""} onChange={(e) => set("targetAudience", e.target.value)} placeholder="np. właściciele aut premium 30–55" /></Field>
        </div>
        <ListInput label="Główne usługi" values={c.services} onChange={(v) => set("services", v)} placeholder="Dodaj usługę i Enter" suggestions={SERVICE_OPTIONS.filter((s) => s.value !== "other").map((s) => s.label)} />
        <ListInput label="Najważniejsze przewagi firmy (wyłącznie prawdziwe)" values={c.advantages} onChange={(v) => set("advantages", v)} placeholder="np. certyfikowany aplikator, własne studio z oświetleniem" />
        <Field label="Domyślne CTA" hint="AI użyje go na końcu rolek. Nie wymyślamy cen ani promocji."><Input value={c.defaultCta ?? ""} onChange={(e) => set("defaultCta", e.target.value)} placeholder="np. Umów konsultację" maxLength={80} /></Field>
        <Field label="Notatki"><Textarea value={c.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} /></Field>
        {errors.form && <p className="text-sm text-bad">{errors.form}</p>}
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={save} disabled={c.name.trim().length < 2}><Save /> {c.id ? "Zapisz zmiany" : "Dodaj klienta"}</Button>
          {c.id && <Button variant="ghost" onClick={async () => { if (!confirm("Usunąć klienta? Projekty pozostaną, ale bez przypisania.")) return; await api(`/api/clients/${c.id}`, { method: "DELETE" }); router.push("/clients"); router.refresh(); }}><Trash2 /> Usuń klienta</Button>}
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Logo</h3>
          {c.id ? (
            <>
              {c.logoAssetId && <img src={`/api/media/${c.logoAssetId}?v=proxy`} alt="Logo" className="mb-3 max-h-28 rounded-lg bg-surface-2 p-3" />}
              <Uploader compact accept="image" params={{ role: "LOGO", clientId: c.id }} title={c.logoAssetId ? "Zmień logo" : "Prześlij logo"} hint="PNG z przezroczystym tłem" onUploaded={() => setTimeout(() => router.refresh(), 1500)} />
            </>
          ) : (
            <p className="text-sm text-muted">Logo dodasz po zapisaniu klienta.</p>
          )}
        </Card>
        <Card className="p-5 text-xs text-muted">
          <p className="mb-1 font-semibold text-fg">Jak AI używa profilu?</p>
          Styl komunikacji, grupa docelowa, usługi, przewagi i CTA trafiają do analiz, scenariuszy, napisów i opisów postów. AI ma zakaz wymyślania cen, promocji, lokalizacji i obietnic skuteczności.
        </Card>
      </div>
    </div>
  );
}
