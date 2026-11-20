import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { CheckItem } from "@/lib/timeline/checklist";

export function Checklist({ items }: { items: CheckItem[] }) {
  const Icon = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle };
  const cls = { ok: "text-good", warn: "text-warn", fail: "text-bad" };
  return (
    <ul className="space-y-2">
      {items.map((c) => {
        const I = Icon[c.status];
        return (
          <li key={c.key} className="flex items-start gap-2.5 text-sm">
            <I className={`mt-0.5 size-4 shrink-0 ${cls[c.status]}`} />
            <div><span className="font-medium">{c.label}</span><p className="text-xs text-muted">{c.detail}</p></div>
          </li>
        );
      })}
    </ul>
  );
}
