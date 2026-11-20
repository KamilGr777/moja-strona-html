"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { JobProgress } from "@/components/jobs/job-progress";
import { Notice } from "@/components/ui/misc";

export function AnalysisPending({ jobId, name, error }: { jobId: string | null; name: string; error?: string | null }) {
  const router = useRouter();
  const [id, setId] = useState(jobId);
  return (
    <div className="mx-auto max-w-xl py-10">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Analiza w toku</p>
      <h1 className="mb-6 text-2xl font-semibold">{name}</h1>
      {error && <Notice tone="bad" className="mb-4">{error}</Notice>}
      {id ? (
        <JobProgress jobId={id} title="Analiza rolki" onDone={() => router.refresh()} onRetried={(n) => setId(n)} />
      ) : (
        <Notice>Nie znaleziono zadania analizy.</Notice>
      )}
      <ol className="mt-6 space-y-1.5 text-xs text-muted">
        {["Metadane: długość, rozdzielczość, FPS, proporcje", "Wykrywanie cięć i scen", "Klatki reprezentatywne (także z pierwszych sekund)", "Ruch, ostrość, jasność, analiza audio i tempa", "Transkrypcja mowy (jeśli skonfigurowana)", "Ocena AI: hook, przekaz, tempo, CTA, napisy", "Raport i propozycja nowego montażu"].map((s, i) => (
          <li key={i} className="flex gap-2"><span className="text-subtle">{i + 1}.</span>{s}</li>
        ))}
      </ol>
    </div>
  );
}
