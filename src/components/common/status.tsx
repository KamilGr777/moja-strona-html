import { Badge } from "@/components/ui/misc";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";

const TONE: Record<string, "neutral" | "primary" | "good" | "warn" | "bad" | "accent"> = {
  DRAFT: "neutral",
  PROCESSING: "primary",
  ANALYZED: "good",
  NEEDS_WORK: "warn",
  EDITING: "accent",
  RENDERED: "good",
  IN_REVIEW: "primary",
  APPROVED: "good",
  CHANGES_REQUESTED: "warn",
  FAILED: "bad",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{PROJECT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function ScorePill({ score, scaled }: { score: number | null | undefined; scaled?: boolean }) {
  if (score == null) return <span className="text-xs text-subtle">—</span>;
  const tone = score >= 75 ? "text-good border-good/30 bg-good/10" : score >= 55 ? "text-warn border-warn/30 bg-warn/10" : "text-bad border-bad/30 bg-bad/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold tabular ${tone}`} title={scaled ? "Wynik techniczny (bez AI) przeliczony na skalę 100" : undefined}>
      {Math.round(score)}
      <span className="font-normal opacity-60">/100{scaled ? "*" : ""}</span>
    </span>
  );
}
