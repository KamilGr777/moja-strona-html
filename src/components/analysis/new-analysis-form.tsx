"use client";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Uploader } from "@/components/media/uploader";
import { api } from "@/lib/client/api";
import { GOAL_OPTIONS, PLATFORM_OPTIONS, SERVICE_OPTIONS } from "@/components/common/option-lists";

export function NewAnalysisForm({ clients, defaultClientId }: { clients: Array<{ id: string; name: string }>; defaultClientId?: string }) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId ?? "none");
  const [goal, setGoal] = useState("leads");
  const [platform, setPlatform] = useState("instagram");
  const [service, setService] = useState("correction");
  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);
  const projectRef = useRef<string | null>(null);

  const params = useCallback(async () => {
    const { project } = await api<{ project: { id: string } }>("/api/projects", {
      body: { name: name.trim() || `Analiza rolki ${new Date().toLocaleDateString("pl-PL")}`, type: "ANALYSIS", clientId: clientId === "none" ? null : clientId, goal, platform, service },
    });
    projectRef.current = project.id;
    return { role: "SOURCE_REEL" as const, projectId: project.id };
  }, [name, clientId, goal, platform, service]);

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Klient">
          <Select value={clientId} onValueChange={setClientId} options={[{ value: "none", label: "Bez klienta" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
        </Field>
        <Field label="Cel rolki">
          <Select value={goal} onValueChange={setGoal} options={GOAL_OPTIONS} />
        </Field>
        <Field label="Platforma">
          <Select value={platform} onValueChange={setPlatform} options={PLATFORM_OPTIONS} />
        </Field>
        <Field label="Usługa">
          <Select value={service} onValueChange={setService} options={SERVICE_OPTIONS} />
        </Field>
      </div>
      <Field label="Nazwa filmu (opcjonalnie)" className="mt-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Korekta lakieru — BMW M4" maxLength={120} />
      </Field>
      <div className="mt-5">
        <Uploader
          params={params}
          accept="video"
          disabled={starting}
          title="Przeciągnij rolkę (MP4, MOV, WebM) lub kliknij, aby wybrać"
          hint="Po przesłaniu analiza uruchomi się automatycznie: metadane, sceny, klatki, audio, transkrypcja i ocena AI."
          onUploaded={async (asset) => {
            setStarting(true);
            try {
              const pId = projectRef.current;
              if (!name.trim() && pId) await api(`/api/projects/${pId}`, { method: "PATCH", body: { name: asset.originalName.replace(/\.[^.]+$/, "").slice(0, 120) } }).catch(() => undefined);
              const { analysis } = await api<{ analysis: { id: string } }>("/api/analyses", { body: { projectId: pId, assetId: asset.id, goal, platform, service } });
              router.push(`/analysis/${analysis.id}`);
            } catch {
              setStarting(false);
            }
          }}
        />
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-subtle">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Ocena ma charakter eksperckiej prognozy jakości kreatywnej — nie jest gwarancją liczby wyświetleń ani sprzedaży.
      </p>
    </Card>
  );
}
