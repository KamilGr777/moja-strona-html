"use client";
import { useEffect, useRef, useState } from "react";

export interface JobState {
  id: string;
  type: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  stage: string | null;
  error: string | null;
  result?: unknown;
}

/** Odpytuje status zadania w tle, dopóki się nie zakończy. */
export function useJob(jobId: string | null | undefined, onDone?: (job: JobState) => void) {
  const [job, setJob] = useState<JobState | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const { job: j } = (await res.json()) as { job: JobState };
          if (stop) return;
          setJob(j);
          if (["COMPLETED", "FAILED", "CANCELLED"].includes(j.status)) {
            done.current?.(j);
            return;
          }
        }
      } catch {
        /* sieć — spróbujemy ponownie */
      }
      if (!stop) timer = setTimeout(tick, 1200);
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [jobId]);
  return job;
}
