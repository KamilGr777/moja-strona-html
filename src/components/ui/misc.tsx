import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "primary" | "good" | "warn" | "bad" | "accent" }) {
  const tones = {
    neutral: "bg-surface-3 text-muted border-border",
    primary: "bg-primary/12 text-[#8fb4ff] border-primary/30",
    good: "bg-good/12 text-good border-good/30",
    warn: "bg-warn/12 text-warn border-warn/30",
    bad: "bg-bad/12 text-bad border-bad/30",
    accent: "bg-accent/12 text-accent border-accent/30",
  };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium [&_svg]:size-3", tones[tone], className)} {...p} />;
}

export function Progress({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "good" | "warn" | "bad" }) {
  const c = { primary: "bg-[linear-gradient(90deg,#3d7bff,#22d3ee)]", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center", className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2"><Icon className="size-5 text-muted" /></div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className }: { tone?: "neutral" | "warn" | "bad" | "primary" | "good"; title?: string; children: React.ReactNode; className?: string }) {
  const tones = {
    neutral: "border-border bg-surface-2 text-muted",
    warn: "border-warn/30 bg-warn/8 text-[#f7cf7a]",
    bad: "border-bad/30 bg-bad/8 text-[#ff8b97]",
    primary: "border-primary/30 bg-primary/8 text-[#a9c4ff]",
    good: "border-good/30 bg-good/8 text-[#7ee2a4]",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
