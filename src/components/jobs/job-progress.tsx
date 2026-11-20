"use client";
import { useState } from "react";
import { Loader2, XCircle, RotateCcw, CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { useJob, type JobState } from "./use-job";

export function JobProgress({ jobId, title, onDone, onRetried, className }: { jobId: string; title: string; onDone?: (j: JobState) => void; onRetried?: (newJobId: string) => void; className?: string }) {
  const job = useJob(jobId, onDone);
  const [busy, setBusy] = useState(false);
  const status = job?.status ?? "QUEUED";
  const running = status === "QUEUED" || status === "RUNNING";
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5", className)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", running ? "border-primary/30 bg-primary/10" : status === "COMPLETED" ? "border-good/30 bg-good/10" : "border-bad/30 bg-bad/10")}>
          {running ? <Loader2 className="size-5 animate-spin text-primary" /> : status === "COMPLETED" ? <CheckCircle2 className="size-5 text-good" /> : status === "CANCELLED" ? <Ban className="size-5 text-warn" /> : <XCircle className="size-5 text-bad" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{title}</p>
            <span className="tabular text-xs text-muted">{Math.round(job?.progress ?? 0)}%</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{job?.stage ?? "W kolejce…"}</p>
          <Progress value={job?.progress ?? 2} className="mt-3" tone={status === "FAILED" ? "bad" : status === "COMPLETED" ? "good" : "primary"} />
          {job?.error && status !== "COMPLETED" && <p className="mt-2 text-xs text-bad">{job.error}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {running && (
          <Button size="sm" variant="ghost" loading={busy} onClick={async () => { setBusy(true); await api(`/api/jobs/${jobId}/cancel`, { method: "POST" }).catch(() => undefined); setBusy(false); }}>
            Anuluj
          </Button>
        )}
        {(status === "FAILED" || status === "CANCELLED") && (
          <Button size="sm" variant="secondary" loading={busy} onClick={async () => { setBusy(true); const r = await api<{ job: { id: string } }>(`/api/jobs/${jobId}/retry`, { method: "POST" }).catch(() => null); setBusy(false); if (r) onRetried?.(r.job.id); }}>
            <RotateCcw /> Ponów
          </Button>
        )}
      </div>
    </div>
  );
}
