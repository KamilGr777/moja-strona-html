"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lightbulb, Bookmark, BookmarkCheck, ArrowRight, Camera, Music2, Film, Target, Clock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge, EmptyState, Notice } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/client/api";
import { GOAL_OPTIONS, SERVICE_OPTIONS, STYLE_OPTIONS } from "@/components/common/option-lists";
import type { Idea } from "@/lib/analysis/templates";

export interface IdeaRow {
  id: string;
  title: string;
  hook: string;
  source: string;
  saved: boolean;
  projectId: string | null;
  data: Idea;
  client: { name: string } | null;
}

function IdeaCard({ idea, onToggle, onProject, onDelete }: { idea: IdeaRow; onToggle: () => void; onProject: () => void; onDelete?: () => void }) {
  const d = idea.data;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge tone={idea.source === "ai" ? "primary" : "neutral"}>{idea.source === "ai" ? "AI" : "Szablon"}</Badge>
            {d.requiresNewFootage && <Badge tone="warn">Wymaga dogrania ujęć</Badge>}
            {idea.client && <Badge>{idea.client.name}</Badge>}
          </div>
          <h3 className="text-base font-semibold leading-snug">{idea.title}</h3>
        </div>
        <div className="flex">
          {onDelete && <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label="Usuń"><Trash2 /></Button>}
          <Button size="icon-sm" variant="ghost" onClick={onToggle} aria-label={idea.saved ? "Usuń z zapisanych" : "Zapisz"}>{idea.saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}</Button>
        </div>
      </div>
      <p className="mt-2 rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 text-sm">Hook: „{d.hook}”</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1"><Target className="size-3.5" />{d.marketingGoal}</span>
        <span className="flex items-center gap-1"><Clock className="size-3.5" />{d.durationSec} s</span>
        <span className="flex items-center gap-1"><Film className="size-3.5" />{d.editStyle}</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-primary">Scenariusz, shot lista, napisy</summary>
        <div className="mt-3 space-y-3">
          <ul className="space-y-1">{d.scenario.map((s, i) => <li key={i} className="flex gap-2 text-xs"><span className="w-16 shrink-0 tabular text-subtle">{s.from}–{s.to} s</span><span>{s.description}</span></li>)}</ul>
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted"><Camera className="size-3.5" /> Shot lista</p>
            <ul className="space-y-1 text-xs">{d.shotList.map((s, i) => <li key={i}>• <span className="text-fg">{s.shot}</span> <span className="text-subtle">— {s.camera} ({s.duration})</span></li>)}</ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted">Napisy</p>
            <div className="flex flex-wrap gap-1">{d.captions.map((c, i) => <Badge key={i}>„{c}”</Badge>)}</div>
          </div>
          <p className="text-xs text-muted"><span className="text-subtle">Ruch kamery:</span> {d.cameraMovement}</p>
          <p className="flex items-center gap-1 text-xs text-muted"><Music2 className="size-3.5" /> {d.music}</p>
        </div>
      </details>
      <div className="mt-auto pt-4">
        <Button size="sm" variant="secondary" onClick={onProject}>{idea.projectId ? "Otwórz projekt" : "Utwórz projekt z pomysłu"} <ArrowRight /></Button>
      </div>
    </Card>
  );
}

export function IdeasApp({ clients, saved: initialSaved }: { clients: Array<{ id: string; name: string }>; saved: IdeaRow[] }) {
  const router = useRouter();
  const [service, setService] = useState("ceramic");
  const [goal, setGoal] = useState("leads");
  const [car, setCar] = useState("");
  const [style, setStyle] = useState("premium");
  const [duration, setDuration] = useState(16);
  const [footage, setFootage] = useState("new");
  const [clientId, setClientId] = useState("none");
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ source: string; warning: string | null } | null>(null);

  async function generate() {
    setBusy(true);
    try {
      const r = await api<{ ideas: IdeaRow[]; source: string; warning: string | null }>("/api/ideas/generate", { body: { service, goal, car: car || null, style, durationSec: duration, footage, clientId: clientId === "none" ? null : clientId } });
      setIdeas(r.ideas.map((i) => ({ ...i, client: clients.find((c) => c.id === clientId) ? { name: clients.find((c) => c.id === clientId)!.name } : null })));
      setNotice({ source: r.source, warning: r.warning });
    } finally {
      setBusy(false);
    }
  }
  async function toggle(i: IdeaRow) {
    await api(`/api/ideas/${i.id}`, { method: "PATCH", body: { saved: !i.saved } });
    const upd = { ...i, saved: !i.saved };
    setIdeas((all) => all.map((x) => (x.id === i.id ? upd : x)));
    setSaved((all) => (upd.saved ? [upd, ...all.filter((x) => x.id !== i.id)] : all.filter((x) => x.id !== i.id)));
  }
  async function project(i: IdeaRow) {
    const r = await api<{ projectId: string }>(`/api/ideas/${i.id}/project`, { method: "POST" });
    router.push(`/montage/${r.projectId}`);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Usługa"><Select value={service} onValueChange={setService} options={SERVICE_OPTIONS} /></Field>
          <Field label="Cel filmu"><Select value={goal} onValueChange={setGoal} options={GOAL_OPTIONS} /></Field>
          <Field label="Styl"><Select value={style} onValueChange={setStyle} options={STYLE_OPTIONS} /></Field>
          <Field label="Klient"><Select value={clientId} onValueChange={setClientId} options={[{ value: "none", label: "Bez klienta" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
          <Field label="Samochód (opcjonalnie)"><Input value={car} onChange={(e) => setCar(e.target.value)} placeholder="np. czarne BMW X5" maxLength={80} /></Field>
          <Field label="Ujęcia"><Select value={footage} onValueChange={setFootage} options={[{ value: "new", label: "Mogę dograć nowe ujęcia" }, { value: "existing", label: "Tylko istniejący materiał" }]} /></Field>
          <Field label={`Docelowa długość: ${duration} s`} className="lg:col-span-2"><Slider value={duration} onChange={(v) => setDuration(Math.round(v))} min={8} max={60} step={1} /></Field>
        </div>
        <Button className="mt-5" size="lg" variant="glow" loading={busy} onClick={generate}><Lightbulb /> Generuj pomysły</Button>
      </Card>
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">Wygenerowane ({ideas.length})</TabsTrigger>
          <TabsTrigger value="saved">Zapisane ({saved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4">
          {notice && <Notice tone={notice.source === "ai" ? "primary" : "warn"} className="mb-4">{notice.source === "ai" ? "Pomysły wygenerowane przez AI na podstawie usługi, celu i profilu klienta." : `${notice.warning ?? "Tryb bez AI."} Pomysły z biblioteki sprawdzonych formatów dla branży (szablony).`}</Notice>}
          {ideas.length ? <div className="grid gap-4 lg:grid-cols-2">{ideas.map((i) => <IdeaCard key={i.id} idea={i} onToggle={() => toggle(i)} onProject={() => project(i)} />)}</div> : <EmptyState icon={Lightbulb} title="Wybierz parametry i wygeneruj pomysły" description="Minimum 10 konkretnych pomysłów: hook, scenariusz sekunda po sekundzie, shot lista, napisy i muzyka." />}
        </TabsContent>
        <TabsContent value="saved" className="mt-4">
          {saved.length ? <div className="grid gap-4 lg:grid-cols-2">{saved.map((i) => <IdeaCard key={i.id} idea={i} onToggle={() => toggle(i)} onProject={() => project(i)} onDelete={async () => { await api(`/api/ideas/${i.id}`, { method: "DELETE" }); setSaved((a) => a.filter((x) => x.id !== i.id)); }} />)}</div> : <EmptyState icon={Bookmark} title="Brak zapisanych pomysłów" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
