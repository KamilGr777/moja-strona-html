"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/client/api";
import { PLATFORM_OPTIONS, SERVICE_OPTIONS } from "@/components/common/option-lists";

export function NewMontageForm({ clients }: { clients: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("none");
  const [service, setService] = useState("ceramic");
  const [platform, setPlatform] = useState("instagram");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nazwa rolki"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Ceramika — Porsche 911" maxLength={120} /></Field>
        <Field label="Klient"><Select value={clientId} onValueChange={setClientId} options={[{ value: "none", label: "Bez klienta" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
        <Field label="Usługa"><Select value={service} onValueChange={setService} options={SERVICE_OPTIONS} /></Field>
        <Field label="Platforma"><Select value={platform} onValueChange={setPlatform} options={PLATFORM_OPTIONS} /></Field>
      </div>
      <Button className="mt-5" size="lg" loading={busy} onClick={async () => {
        setBusy(true);
        try {
          const { project } = await api<{ project: { id: string } }>("/api/projects", { body: { name: name.trim() || `Auto montaż ${new Date().toLocaleDateString("pl-PL")}`, type: "AUTO_MONTAGE", clientId: clientId === "none" ? null : clientId, service, platform, goal: "leads" } });
          router.push(`/montage/${project.id}`);
        } catch {
          setBusy(false);
        }
      }}><Wand2 /> Utwórz projekt i dodaj nagrania</Button>
    </Card>
  );
}
