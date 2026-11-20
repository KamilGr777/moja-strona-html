"use client";
import { useState } from "react";
import { Link2, Copy, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/utils";

export function ShareBox({ exportId, active, expiresAt, reviewStatus }: { exportId: string; active: boolean; expiresAt: string | null; reviewStatus: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [isActive, setActive] = useState(active);
  const [exp, setExp] = useState(expiresAt);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {reviewStatus === "approved" && <Badge tone="good">Zaakceptowane przez klienta</Badge>}
        {reviewStatus === "changes_requested" && <Badge tone="warn">Klient prosi o poprawki</Badge>}
        {reviewStatus === "pending" && isActive && <Badge tone="primary">Oczekuje na akceptację</Badge>}
        {isActive && exp && <span className="text-xs text-subtle">Link ważny do {formatDate(exp)}</span>}
      </div>
      {url && (
        <div className="flex gap-2">
          <Input readOnly value={url} className="text-xs" onFocus={(e) => e.target.select()} />
          <Button size="icon" variant="secondary" onClick={() => { void navigator.clipboard.writeText(url); toast.success("Skopiowano link."); }} aria-label="Kopiuj"><Copy /></Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={busy} onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ url: string; expiresAt: string }>(`/api/exports/${exportId}/share`, { body: { days: 14 } });
            setUrl(r.url);
            setActive(true);
            setExp(r.expiresAt);
          } finally {
            setBusy(false);
          }
        }}><Link2 /> {isActive ? "Wygeneruj nowy link" : "Utwórz prywatny link dla klienta"}</Button>
        {isActive && <Button size="sm" variant="ghost" onClick={async () => { await api(`/api/exports/${exportId}/share`, { method: "DELETE" }); setActive(false); setUrl(null); toast.success("Link unieważniony."); }}><Ban /> Unieważnij</Button>}
      </div>
      <p className="text-[11px] text-subtle">Link zawiera losowy token (przechowujemy tylko jego hash). Klient może obejrzeć film, dodać komentarz przy konkretnym czasie, zaakceptować projekt lub poprosić o poprawki — bez logowania.</p>
    </div>
  );
}
