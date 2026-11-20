"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/client/api";

export function ProjectClientSelect({ projectId, clientId, clients }: { projectId: string; clientId: string | null; clients: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [v, setV] = useState(clientId ?? "none");
  return (
    <Select value={v} onValueChange={async (x) => { setV(x); await api(`/api/projects/${projectId}`, { method: "PATCH", body: { clientId: x === "none" ? null : x } }); router.refresh(); }} options={[{ value: "none", label: "Bez klienta" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
  );
}

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  return (
    <Button variant="ghost" onClick={async () => { if (!confirm("Usunąć projekt wraz z materiałami, analizami, montażami i eksportami? Tej operacji nie można cofnąć.")) return; await api(`/api/projects/${projectId}`, { method: "DELETE" }); router.push("/projects"); router.refresh(); }}>
      <Trash2 /> Usuń projekt
    </Button>
  );
}
