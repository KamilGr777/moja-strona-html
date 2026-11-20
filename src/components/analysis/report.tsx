"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wand2, Clapperboard, Trash2, Target, Gauge, ListChecks, Zap, Camera, Type, Music2, HelpCircle, Cpu, CheckCircle2, AlertTriangle, XCircle, Clock, Sparkles, Film, ChevronRight, Info, Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, Notice, Progress } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/client/api";
import { cn, formatDuration, formatTimecode } from "@/lib/utils";
import { GOALS, PLATFORMS, SERVICES, SHOT_CATEGORIES } from "@/lib/constants";
import { ScoreGauge } from "./score-gauge";
import { FindingsTimeline } from "./findings-timeline";
import { RetentionChart, type RetentionData } from "./retention-chart";
import { FixReelDialog } from "./fix-dialog";

export interface Finding {
  id: string;
  start: number;
  end: number;
  severity: "GOOD" | "WARN" | "BAD";
  category: string;
  shotDescription: string;
  problem: string | null;
  reason: string | null;
  suggestion: string;
  suggestedCaption: string | null;
  newShotDuration: number | null;
  priority: number;
  source: string;
}

export interface AnalysisView {
  id: string;
  mode: "AI" | "HEURISTIC";
  model: string | null;
  totalScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  priorityFixes: string[];
  optimalLengthSec: number | null;
  optimalLengthNote: string | null;
  goal: string | null;
  platform: string | null;
  service: string | null;
  warnings: string[];
  questions: Array<{ id: number; question: string; answer: string; verdict: string }> | null;
  hooks: Array<{ type: string; typeLabel: string; text: string; shot: string; sourceStart: number | null; sourceEnd: number | null; needsNewFootage: boolean | null; duration: number; textAnimation: string; musicIn: string; rationale: string; source: string; unverified?: boolean }> | null;
  missingShots: { source: string; items: Array<{ name: string; what: string; angle: string; movement: string; sourceLength: string; editLength: string; lighting: string; placement: string; why: string }> } | null;
  musicAdvice: { source: string; mood: string; tempo: string; bpmMin: number; bpmMax: number; start: string; accents: string[]; cutSync: string; recommendation: string; measured: { bpm: number | null; confidence: number; energyRises: number[]; lufs: number | null } | null } | null;
  captionIdeas: { source: string; items: Array<{ text: string; start: number; end: number; kind: string }> } | null;
  retention: RetentionData | null;
  transcript: { text: string; provider: string; segments: Array<{ start: number; end: number; text: string }> } | null;
  onScreenText: Array<{ start: number; end: number; text: string }> | null;
  technical: { metrics: Record<string, unknown> & { durationSec: number; cuts: number; avgShot: number; longestShot: { length: number }; firstCutAt: number | null }; audio: { integratedLufs: number | null; truePeakDb: number | null; tempo: { bpm: number | null; confidence: number } } | null; totalScaled: boolean } | null;
  findings: Finding[];
  categories: Array<{ key: string; label: string; score: number | null; maxScore: number; rationale: string; basis: string }>;
  asset: { id: string; durationSec: number; width: number; height: number; fps: number; hasAudio: boolean; scenes: Array<{ id: string; index: number; start: number; end: number; description: string | null; category: string | null; interestScore: number | null }> };
  project: { id: string; name: string; shotChecklist: Array<{ name: string; done: boolean; detail?: string }> | null; client: { name: string } | null };
}

const SEV_ICON = { GOOD: CheckCircle2, WARN: AlertTriangle, BAD: XCircle };
const SEV_CLS = { GOOD: "text-good", WARN: "text-warn", BAD: "text-bad" };
const SEV_LABEL = { GOOD: "Dobry moment", WARN: "Do poprawy", BAD: "Problem" };
const VERDICT = { yes: { label: "Tak", tone: "good" }, partly: { label: "Częściowo", tone: "warn" }, no: { label: "Nie", tone: "bad" }, unknown: { label: "Brak danych", tone: "neutral" } } as const;

export function AnalysisReport({ a, beforeAfter }: { a: AnalysisView; beforeAfter?: React.ReactNode }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState("score");
  const [filter, setFilter] = useState<"ALL" | "GOOD" | "WARN" | "BAD">("ALL");
  const [fixOpen, setFixOpen] = useState(false);
  const [fixMode, setFixMode] = useState<"full" | "weak-only">("full");
  const dur = a.asset.durationSec;
  const heuristic = a.mode === "HEURISTIC";

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(dur - 0.05, t));
    setTime(v.currentTime);
  };
  const findings = useMemo(() => a.findings.filter((f) => filter === "ALL" || f.severity === filter), [a.findings, filter]);
  const counts = { GOOD: a.findings.filter((f) => f.severity === "GOOD").length, WARN: a.findings.filter((f) => f.severity === "WARN").length, BAD: a.findings.filter((f) => f.severity === "BAD").length };

  async function openEditor() {
    const r = await api<{ editingProjectId: string }>(`/api/analyses/${a.id}/edit`, { method: "POST" });
    router.push(`/editor/${r.editingProjectId}`);
  }
  async function applyHook(i: number) {
    const r = await api<{ editingProjectId: string; needsFootage: boolean; usedFootage: boolean }>(`/api/analyses/${a.id}/apply-hook`, { body: { index: i } });
    if (r.needsFootage) toast.warning("Ten hook wymaga ujęcia, którego nie ma w materiale — dodano napis, a ujęcie trzeba dograć.", { action: { label: "Otwórz edytor", onClick: () => router.push(`/editor/${r.editingProjectId}`) } });
    else toast.success("Hook dodany na początek projektu montażowego.", { action: { label: "Otwórz edytor", onClick: () => router.push(`/editor/${r.editingProjectId}`) } });
  }
  async function remove() {
    if (!confirm("Usunąć projekt wraz z materiałami i analizami? Tej operacji nie można cofnąć.")) return;
    await api(`/api/projects/${a.project.id}`, { method: "DELETE" });
    router.push("/analysis");
    router.refresh();
  }

  const checklist = a.project.shotChecklist ?? [];
  const [shots, setShots] = useState(checklist);
  async function toggleShot(name: string, detail?: string) {
    const exists = shots.find((s) => s.name === name);
    const next = exists ? shots.map((s) => (s.name === name ? { ...s, done: !s.done } : s)) : [...shots, { name, done: false, detail }];
    setShots(next);
    await api(`/api/projects/${a.project.id}`, { method: "PATCH", body: { shotChecklist: next }, silent: true }).catch(() => undefined);
  }

  return (
    <div>
      {/* Nagłówek */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Raport analizy</p>
          <h1 className="text-2xl font-semibold tracking-tight">{a.project.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.project.client && <Badge>{a.project.client.name}</Badge>}
            {a.goal && <Badge tone="primary"><Target />{GOALS[a.goal as keyof typeof GOALS] ?? a.goal}</Badge>}
            {a.platform && <Badge>{PLATFORMS[a.platform as keyof typeof PLATFORMS]?.label}</Badge>}
            {a.service && <Badge>{SERVICES[a.service as keyof typeof SERVICES]}</Badge>}
            <Badge tone={heuristic ? "warn" : "accent"}>{heuristic ? <><Gauge /> Analiza techniczna (bez AI)</> : <><Sparkles /> Analiza AI</>}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Usuń projekt" title="Usuń projekt"><Trash2 /></Button>
          <Button variant="secondary" onClick={openEditor}><Clapperboard /> Otwórz w edytorze</Button>
          <Button variant="glow" size="lg" onClick={() => { setFixMode("full"); setFixOpen(true); }}><Wand2 /> POPRAW ROLKĘ Z AI</Button>
        </div>
      </div>

      {a.warnings.map((w, i) => (
        <Notice key={i} tone={w.startsWith("Tryb heurystyczny") ? "warn" : "neutral"} className="mb-3">{w}</Notice>
      ))}

      {beforeAfter}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        {/* Lewa kolumna: odtwarzacz + oś czasu + retencja */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden p-3">
            <div className="mx-auto flex max-h-[62vh] justify-center overflow-hidden rounded-xl bg-black" style={{ aspectRatio: `${a.asset.width}/${a.asset.height}` }}>
              <video ref={videoRef} src={`/api/media/${a.asset.id}?v=proxy`} poster={`/api/media/${a.asset.id}?v=poster`} controls playsInline className="h-full w-full object-contain" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} />
            </div>
            <div className="mt-3 px-1">
              <FindingsTimeline duration={dur} current={time} findings={a.findings} scenes={a.asset.scenes} selectedId={selected} onSeek={seek} onSelect={(id) => { setSelected(id); setTab("findings"); setTimeout(() => document.getElementById(`f-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }} />
            </div>
          </Card>
          {a.retention && (
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>AI Reel Retention</CardTitle>
                  <p className="text-xs text-muted">Prognozowana atrakcyjność kolejnych fragmentów</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { setFixMode("weak-only"); setFixOpen(true); }}>Popraw słabe momenty</Button>
              </CardHeader>
              <CardContent><RetentionChart data={a.retention} duration={dur} current={time} onSeek={seek} /></CardContent>
            </Card>
          )}
        </div>

        {/* Prawa kolumna */}
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList>
              <TabsTrigger value="score"><Gauge /> Ocena</TabsTrigger>
              <TabsTrigger value="findings"><ListChecks /> Sekunda po sekundzie <span className="text-subtle">{a.findings.length}</span></TabsTrigger>
              <TabsTrigger value="hooks"><Zap /> Hooki</TabsTrigger>
              <TabsTrigger value="shots"><Camera /> Co nagrać?</TabsTrigger>
              <TabsTrigger value="captions"><Type /> Napisy</TabsTrigger>
              <TabsTrigger value="music"><Music2 /> Muzyka</TabsTrigger>
              {a.questions && <TabsTrigger value="questions"><HelpCircle /> 13 pytań</TabsTrigger>}
              <TabsTrigger value="tech"><Cpu /> Dane techniczne</TabsTrigger>
            </TabsList>
          </div>

          {/* OCENA */}
          <TabsContent value="score" className="mt-4 space-y-4">
            <Card className="p-5">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <ScoreGauge score={a.totalScore} scaled={a.technical?.totalScaled} />
                <div className="flex-1">
                  <p className="text-[15px] leading-relaxed text-fg">{a.summary}</p>
                  {a.technical?.totalScaled && <p className="mt-2 text-xs text-warn">* Wynik techniczny przeliczony na skalę 100 z kategorii, które da się zmierzyć bez AI. Kategorie oznaczone „brak danych” wymagają analizy AI.</p>}
                  {a.optimalLengthSec != null && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
                      <Clock className="mt-0.5 size-4 text-primary" />
                      <div className="text-sm">
                        <span className="font-semibold">Optymalna długość: {Math.round(a.optimalLengthSec)} s</span>
                        <span className="text-muted"> (obecnie {formatDuration(dur)})</span>
                        {a.optimalLengthNote && <p className="mt-0.5 text-xs text-muted">{a.optimalLengthNote}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Punktacja kategorii</h3>
              <div className="space-y-4">
                {a.categories.map((c) => (
                  <div key={c.key}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{c.label}</span>
                      <span className="tabular text-muted">{c.score === null ? <Badge>brak danych</Badge> : <><span className="font-semibold text-fg">{c.score}</span> / {c.maxScore}</>}</span>
                    </div>
                    <Progress value={c.score === null ? 0 : (c.score / c.maxScore) * 100} tone={c.score === null ? "primary" : c.score / c.maxScore >= 0.75 ? "good" : c.score / c.maxScore >= 0.5 ? "warn" : "bad"} />
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{c.rationale}{c.basis === "heuristic" && <span className="text-subtle"> · pomiar techniczny</span>}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-good" /> Mocne strony</h3>
                <ul className="space-y-2 text-sm text-muted">{a.strengths.length ? a.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-good">•</span>{s}</li>) : <li>—</li>}</ul>
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4 text-warn" /> Słabe strony</h3>
                <ul className="space-y-2 text-sm text-muted">{a.weaknesses.length ? a.weaknesses.map((s, i) => <li key={i} className="flex gap-2"><span className="text-warn">•</span>{s}</li>) : <li>—</li>}</ul>
              </Card>
            </div>
            <Card className="border-primary/30 p-5">
              <h3 className="mb-3 text-sm font-semibold">Priorytetowe poprawki</h3>
              <ol className="space-y-2.5">
                {a.priorityFixes.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{i + 1}</span>
                    <span className="pt-0.5 leading-relaxed">{p}</span>
                  </li>
                ))}
              </ol>
              <Button className="mt-4" variant="glow" onClick={() => { setFixMode("full"); setFixOpen(true); }}><Wand2 /> Zastosuj automatycznie — Popraw rolkę</Button>
            </Card>
          </TabsContent>

          {/* UWAGI */}
          <TabsContent value="findings" className="mt-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(["ALL", "BAD", "WARN", "GOOD"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("rounded-lg border px-2.5 py-1 text-xs transition", filter === f ? "border-primary/50 bg-primary/12 text-fg" : "border-border text-muted hover:text-fg")}>
                  {f === "ALL" ? `Wszystkie (${a.findings.length})` : `${SEV_LABEL[f]} (${counts[f]})`}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {findings.map((f) => {
                const Icon = SEV_ICON[f.severity];
                return (
                  <Card id={`f-${f.id}`} key={f.id} className={cn("p-4 transition", selected === f.id && "border-primary/60 ring-1 ring-primary/40")}>
                    <div className="flex items-start gap-3">
                      <Icon className={cn("mt-0.5 size-5 shrink-0", SEV_CLS[f.severity])} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => { seek(f.start); setSelected(f.id); }} className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-semibold tabular hover:bg-primary/20">
                            {formatTimecode(f.start)}–{formatTimecode(f.end)} ▶
                          </button>
                          <Badge tone={f.severity === "GOOD" ? "good" : f.severity === "WARN" ? "warn" : "bad"}>{SEV_LABEL[f.severity]}</Badge>
                          {f.severity !== "GOOD" && <Badge>Priorytet {f.priority}</Badge>}
                          <Badge tone={f.source === "ai" ? "primary" : "neutral"}>{f.source === "ai" ? "AI" : "pomiar"}</Badge>
                        </div>
                        <dl className="mt-3 grid gap-2 text-sm">
                          <div><dt className="text-xs text-subtle">Ujęcie</dt><dd>{f.shotDescription}</dd></div>
                          {f.problem && <div><dt className="text-xs text-subtle">Problem</dt><dd>{f.problem}</dd></div>}
                          {f.reason && <div><dt className="text-xs text-subtle">Dlaczego to ważne</dt><dd className="text-muted">{f.reason}</dd></div>}
                          <div className="rounded-lg border border-primary/25 bg-primary/8 px-3 py-2"><dt className="text-xs text-[#8fb4ff]">{f.severity === "GOOD" ? "Rekomendacja" : "Sugestia"}</dt><dd>{f.suggestion}</dd></div>
                          {(f.suggestedCaption || f.newShotDuration) && (
                            <div className="flex flex-wrap gap-4 text-xs text-muted">
                              {f.suggestedCaption && <span>Napis: <span className="text-fg">„{f.suggestedCaption}”</span></span>}
                              {f.newShotDuration && <span>Czas nowego ujęcia: <span className="text-fg">{f.newShotDuration.toFixed(1).replace(".", ",")} s</span></span>}
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {!findings.length && <p className="text-sm text-muted">Brak uwag w tej kategorii.</p>}
            </div>
          </TabsContent>

          {/* HOOKI */}
          <TabsContent value="hooks" className="mt-4">
            {a.hooks?.[0]?.source === "template" && <Notice tone="warn" className="mb-3">Propozycje z biblioteki szablonów dla tej usługi (bez AI) — obecność wymaganego ujęcia w materiale nie została zweryfikowana.</Notice>}
            <div className="grid gap-3 lg:grid-cols-2">
              {a.hooks?.map((h, i) => (
                <Card key={i} className="flex flex-col p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone="primary"><Zap />{h.typeLabel}</Badge>
                    {h.needsNewFootage === true ? <Badge tone="warn">Wymaga dogrania</Badge> : h.needsNewFootage === false ? <Badge tone="good">Ujęcie jest w materiale</Badge> : <Badge>Niezweryfikowane</Badge>}
                  </div>
                  <p className="text-[17px] font-semibold leading-snug">„{h.text}”</p>
                  <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-subtle">Ujęcie</dt><dd>{h.shot}{h.sourceStart !== null && <button className="ml-1 text-primary hover:underline" onClick={() => seek(h.sourceStart!)}>({formatTimecode(h.sourceStart)})</button>}</dd>
                    <dt className="text-subtle">Długość</dt><dd>{h.duration.toFixed(1).replace(".", ",")} s</dd>
                    <dt className="text-subtle">Animacja napisu</dt><dd>{h.textAnimation}</dd>
                    <dt className="text-subtle">Wejście muzyki</dt><dd>{h.musicIn}</dd>
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted">{h.rationale}</p>
                  <div className="mt-auto pt-4"><Button size="sm" variant="secondary" onClick={() => applyHook(i)}>Zastosuj hook <ChevronRight /></Button></div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* CO NAGRAĆ */}
          <TabsContent value="shots" className="mt-4">
            <Notice tone={a.missingShots?.source === "ai" ? "primary" : "warn"} className="mb-3">
              {a.missingShots?.source === "ai" ? "Ujęcia, których brakuje w przesłanym materiale dla tego typu usługi (na podstawie analizy obrazu)." : "Lista kontrolna ujęć dla wybranej usługi (bez AI nie da się automatycznie sprawdzić, które ujęcia już są w materiale). Zaznacz, co masz, a resztę dograj."}
              {" "}Nie proponujemy ujęć, które sugerowałyby efekt nieosiągnięty na nagranym aucie.
            </Notice>
            <div className="space-y-3">
              {a.missingShots?.items.map((s, i) => {
                const st = shots.find((x) => x.name === s.name);
                return (
                  <Card key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleShot(s.name, s.what)} className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition", st?.done ? "border-good bg-good text-white" : st ? "border-primary bg-primary/20" : "border-border-strong hover:border-primary")} aria-label="Dodaj do checklisty / oznacz jako nagrane">
                        {st?.done && <Check className="size-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{s.name}</p>
                          {st && <Badge tone={st.done ? "good" : "primary"}>{st.done ? "Nagrane" : "Na liście do nagrania"}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted">{s.what}</p>
                        <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                          <div><dt className="inline text-subtle">Kamera: </dt><dd className="inline">{s.angle}</dd></div>
                          <div><dt className="inline text-subtle">Ruch: </dt><dd className="inline">{s.movement}</dd></div>
                          <div><dt className="inline text-subtle">Nagranie: </dt><dd className="inline">{s.sourceLength}</dd></div>
                          <div><dt className="inline text-subtle">W montażu: </dt><dd className="inline">{s.editLength}</dd></div>
                          <div><dt className="inline text-subtle">Światło: </dt><dd className="inline">{s.lighting}</dd></div>
                          <div><dt className="inline text-subtle">Wykorzystanie: </dt><dd className="inline">{s.placement}</dd></div>
                        </dl>
                        <p className="mt-2 text-xs text-[#8fb4ff]">Cel: {s.why}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-subtle">Kliknij pole wyboru, aby dodać ujęcie do checklisty następnej sesji nagraniowej (zapisywane w projekcie); drugie kliknięcie oznacza je jako nagrane.</p>
          </TabsContent>

          {/* NAPISY */}
          <TabsContent value="captions" className="mt-4 space-y-4">
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-semibold">Napisy marketingowe (tryb B)</h3>
              <p className="mb-3 text-xs text-muted">{a.captionIdeas?.source === "ai" ? "Propozycje AI dopasowane do treści, usługi i celu." : "Szablony dla wybranej usługi (bez AI)."} Zastosujesz je w „Popraw rolkę” lub w edytorze.</p>
              <ul className="space-y-2">
                {a.captionIdeas?.items.map((c, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <button onClick={() => seek(c.start)} className="tabular text-xs text-primary hover:underline">{formatTimecode(c.start)}</button>
                    <span className="flex-1">„{c.text}”</span>
                    <Badge>{c.kind}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-semibold">Transkrypcja mowy (tryb A)</h3>
              {a.transcript ? (
                <>
                  <p className="mb-3 text-xs text-muted">Rozpoznana mowa ({a.transcript.provider}) — w edytorze zostanie zamieniona na napisy z podświetlaniem słów.</p>
                  <ul className="space-y-1.5 text-sm">{a.transcript.segments.map((s, i) => (<li key={i} className="flex gap-3"><button onClick={() => seek(s.start)} className="tabular text-xs text-primary hover:underline">{formatTimecode(s.start)}</button><span>{s.text}</span></li>))}</ul>
                </>
              ) : (
                <p className="text-sm text-muted">Brak transkrypcji — w filmie nie wykryto mowy lub transkrypcja nie jest skonfigurowana (TRANSCRIPTION_PROVIDER).</p>
              )}
            </Card>
            {a.onScreenText && a.onScreenText.length > 0 && (
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">Napisy wykryte w filmie</h3>
                <ul className="space-y-1.5 text-sm">{a.onScreenText.map((s, i) => (<li key={i} className="flex gap-3"><span className="tabular text-xs text-subtle">{formatTimecode(s.start)}</span><span>„{s.text}”</span></li>))}</ul>
              </Card>
            )}
          </TabsContent>

          {/* MUZYKA */}
          <TabsContent value="music" className="mt-4">
            {a.musicAdvice && (
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary"><Music2 />{a.musicAdvice.mood}</Badge>
                  <Badge>{a.musicAdvice.tempo}</Badge>
                  <Badge>{a.musicAdvice.bpmMin}–{a.musicAdvice.bpmMax} BPM</Badge>
                  {a.musicAdvice.source !== "ai" && <Badge tone="warn">rekomendacja z biblioteki stylów</Badge>}
                </div>
                <p className="mt-4 text-[15px] leading-relaxed">{a.musicAdvice.recommendation}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface-2 p-3"><dt className="text-xs text-subtle">Rozpoczęcie</dt><dd className="mt-1">{a.musicAdvice.start}</dd></div>
                  <div className="rounded-lg border border-border bg-surface-2 p-3"><dt className="text-xs text-subtle">Synchronizacja cięć</dt><dd className="mt-1">{a.musicAdvice.cutSync}</dd></div>
                </dl>
                {a.musicAdvice.accents.length > 0 && (
                  <div className="mt-4"><p className="mb-2 text-xs text-subtle">Momenty podbicia dynamiki</p><ul className="space-y-1 text-sm">{a.musicAdvice.accents.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
                )}
                {a.musicAdvice.measured && (
                  <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
                    <p className="mb-1 font-semibold text-fg">Pomiar ścieżki audio w filmie</p>
                    Tempo: {a.musicAdvice.measured.bpm ? `${a.musicAdvice.measured.bpm} BPM (pewność ${Math.round(a.musicAdvice.measured.confidence * 100)}%)` : "brak wyraźnego rytmu"} · Głośność: {a.musicAdvice.measured.lufs != null ? `${a.musicAdvice.measured.lufs.toFixed(1)} LUFS` : "—"} · Wzrosty energii: {a.musicAdvice.measured.energyRises.map((r) => `${r.toFixed(1)} s`).join(", ") || "brak"}
                  </div>
                )}
                <p className="mt-4 text-xs text-subtle">Nie pobieramy utworów z TikToka, Instagrama ani Spotify. Dodaj własny, legalnie licencjonowany utwór w Bibliotece nagrań lub w edytorze — system wykryje jego tempo i beaty.</p>
              </Card>
            )}
          </TabsContent>

          {/* 13 PYTAŃ */}
          {a.questions && (
            <TabsContent value="questions" className="mt-4 space-y-2">
              {a.questions.map((q) => {
                const v = VERDICT[q.verdict as keyof typeof VERDICT] ?? VERDICT.unknown;
                return (
                  <Card key={q.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{q.id}. {q.question}</p>
                      <Badge tone={v.tone}>{v.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{q.answer}</p>
                  </Card>
                );
              })}
            </TabsContent>
          )}

          {/* DANE TECHNICZNE */}
          <TabsContent value="tech" className="mt-4 space-y-4">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Metadane i pomiary</h3>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  ["Długość", formatDuration(dur)],
                  ["Rozdzielczość", `${a.asset.width}×${a.asset.height}`],
                  ["FPS", a.asset.fps?.toFixed(2)],
                  ["Liczba scen / cięć", `${a.asset.scenes.length} / ${a.technical?.metrics.cuts ?? "—"}`],
                  ["Średnia długość ujęcia", a.technical ? `${a.technical.metrics.avgShot.toFixed(2)} s` : "—"],
                  ["Najdłuższe ujęcie", a.technical ? `${a.technical.metrics.longestShot.length.toFixed(2)} s` : "—"],
                  ["Pierwsze cięcie", a.technical?.metrics.firstCutAt != null ? `${a.technical.metrics.firstCutAt.toFixed(2)} s` : "brak"],
                  ["Głośność (LUFS)", a.technical?.audio?.integratedLufs?.toFixed(1) ?? (a.asset.hasAudio ? "—" : "brak audio")],
                  ["True peak", a.technical?.audio?.truePeakDb != null ? `${a.technical.audio.truePeakDb.toFixed(1)} dBTP` : "—"],
                  ["Tempo audio", a.technical?.audio?.tempo.bpm ? `${a.technical.audio.tempo.bpm} BPM` : "—"],
                  ["Tryb analizy", a.mode === "AI" ? `AI (${a.model})` : "heurystyczny"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 border-b border-border/60 py-1.5"><dt className="text-muted">{k}</dt><dd className="tabular">{v ?? "—"}</dd></div>
                ))}
              </dl>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Wykryte sceny</h3>
              <ul className="space-y-2">
                {a.asset.scenes.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-2">
                    <img src={`/api/media/scene/${s.id}`} alt="" className="h-14 w-10 rounded object-cover" loading="lazy" />
                    <button onClick={() => seek(s.start)} className="tabular text-xs text-primary hover:underline">{formatTimecode(s.start)}–{formatTimecode(s.end)}</button>
                    <span className="min-w-0 flex-1 truncate text-sm">{s.description ?? <span className="text-subtle">Scena {s.index + 1}</span>}</span>
                    {s.category && <Badge>{SHOT_CATEGORIES[s.category as keyof typeof SHOT_CATEGORIES] ?? s.category}</Badge>}
                    {s.interestScore != null && <Tooltip content="Atrakcyjność ujęcia wg AI (0–10)"><span className="tabular text-xs text-muted">{s.interestScore.toFixed(1)}</span></Tooltip>}
                  </li>
                ))}
              </ul>
            </Card>
            <p className="flex items-center gap-1.5 text-xs text-subtle"><Info className="size-3.5" /> Pomiary: FFmpeg (scdet/select, signalstats, blurdetect, ebur128), analiza tempa: spectral flux + autokorelacja.</p>
          </TabsContent>
        </Tabs>
      </div>

      <FixReelDialog open={fixOpen} onOpenChange={setFixOpen} analysisId={a.id} mode={fixMode} defaultDuration={Math.round(Math.min(a.optimalLengthSec ?? dur, dur))} maxDuration={Math.floor(dur)} />
      <p className="mt-8 flex items-center gap-1.5 text-xs text-subtle"><Film className="size-3.5" /> Ocena ma charakter eksperckiej prognozy jakości kreatywnej — nie jest gwarancją liczby wyświetleń ani sprzedaży. <Link href="/analysis" className="ml-auto text-primary hover:underline">Nowa analiza</Link></p>
    </div>
  );
}
