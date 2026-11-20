"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Music2, FolderOpen, Loader2, AlertCircle, FileVideo, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Uploader } from "@/components/media/uploader";
import { api } from "@/lib/client/api";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import { SHOT_CATEGORIES } from "@/lib/constants";
import { SHOT_OPTIONS } from "@/components/common/option-lists";

export interface LibAsset {
  id: string;
  kind: string;
  role: string;
  status: string;
  error: string | null;
  originalName: string;
  sizeBytes: number;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  license: string | null;
  projectId: string | null;
  project: { name: string } | null;
  hasPoster: boolean;
  createdAt: string;
  bpm: number | null;
}

export function LibraryApp({ assets: initial, musicLibrary }: { assets: LibAsset[]; musicLibrary: boolean }) {
  const router = useRouter();
  const [assets, setAssets] = useState(initial);
  const [q, setQ] = useState("");
  const [license, setLicense] = useState("");
  const filtered = assets.filter((a) => !q || a.originalName.toLowerCase().includes(q.toLowerCase()) || a.project?.name.toLowerCase().includes(q.toLowerCase()));
  const groups = {
    video: filtered.filter((a) => a.kind === "VIDEO" && a.role !== "RENDER"),
    music: filtered.filter((a) => a.role === "MUSIC"),
    renders: filtered.filter((a) => a.role === "RENDER"),
    images: filtered.filter((a) => a.kind === "IMAGE"),
  };
  async function remove(a: LibAsset) {
    if (!confirm(`Trwale usunąć „${a.originalName}”? Plik zniknie także z projektów, które go używają.`)) return;
    await api(`/api/assets/${a.id}`, { method: "DELETE" });
    setAssets((x) => x.filter((y) => y.id !== a.id));
    toast.success("Plik usunięty.");
  }
  async function patch(a: LibAsset, body: Partial<Pick<LibAsset, "tags" | "license">>) {
    await api(`/api/assets/${a.id}`, { method: "PATCH", body });
    setAssets((x) => x.map((y) => (y.id === a.id ? { ...y, ...body } : y)));
  }
  const statusEl = (a: LibAsset) => (a.status === "READY" ? null : a.status === "FAILED" ? <Badge tone="bad"><AlertCircle />{a.error ?? "Błąd"}</Badge> : <Badge tone="primary"><Loader2 className="animate-spin" />Przetwarzanie</Badge>);
  const row = (a: LibAsset, extra?: React.ReactNode) => (
    <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      {a.hasPoster ? <img src={`/api/media/${a.id}?v=poster`} alt="" className="h-14 w-10 shrink-0 rounded object-cover" /> : <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-surface-2">{a.kind === "AUDIO" ? <Music2 className="size-4 text-subtle" /> : a.kind === "IMAGE" ? <ImageIcon className="size-4 text-subtle" /> : <FileVideo className="size-4 text-subtle" />}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.originalName}</p>
        <p className="truncate text-xs text-subtle">
          {[a.durationSec ? formatDuration(a.durationSec) : null, a.width ? `${a.width}×${a.height}` : null, formatBytes(a.sizeBytes), a.bpm ? `${a.bpm} BPM` : null, formatDate(a.createdAt)].filter(Boolean).join(" · ")}
          {a.project && a.projectId && <> · <Link href={`/projects/${a.projectId}`} className="text-primary hover:underline">{a.project.name}</Link></>}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">{statusEl(a)}</div>
      </div>
      {extra}
      <div className="flex shrink-0 gap-1">
        <Button asChild size="icon-sm" variant="ghost"><a href={`/api/media/${a.id}?v=original&download=1`} aria-label="Pobierz oryginał"><Download /></a></Button>
        <Button size="icon-sm" variant="ghost" onClick={() => remove(a)} aria-label="Usuń"><Trash2 /></Button>
      </div>
    </li>
  );
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po nazwie pliku lub projekcie…" className="max-w-sm" />
      </div>
      <Tabs defaultValue="video">
        <TabsList>
          <TabsTrigger value="video">Nagrania ({groups.video.length})</TabsTrigger>
          <TabsTrigger value="music">Muzyka ({groups.music.length})</TabsTrigger>
          <TabsTrigger value="renders">Rendery ({groups.renders.length})</TabsTrigger>
          <TabsTrigger value="images">Logo i okładki ({groups.images.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="video" className="mt-4">
          {groups.video.length ? (
            <Card><ul className="divide-y divide-border">{groups.video.map((a) => row(a, <div className="w-52"><Select value={a.tags.find((t) => t in SHOT_CATEGORIES) ?? "none"} onValueChange={(v) => patch(a, { tags: v === "none" ? [] : [v] })} className="h-8 text-xs" options={[{ value: "none", label: "Rodzaj ujęcia" }, ...SHOT_OPTIONS]} /></div>))}</ul></Card>
          ) : <EmptyState icon={FolderOpen} title="Brak nagrań" description="Nagrania dodajesz w Analizie rolek, AI Auto Montażu lub edytorze." />}
        </TabsContent>
        <TabsContent value="music" className="mt-4 space-y-4">
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-semibold">Dodaj legalnie licencjonowaną muzykę</h3>
            <p className="mb-3 text-xs text-muted">Podaj źródło licencji — system wykryje tempo (BPM), beaty i momenty wzrostu energii do synchronizacji cięć. Nie pobieramy utworów z TikToka, Instagrama ani Spotify.</p>
            <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Licencja / źródło (np. Artlist, Epidemic Sound, utwór własny)" className="mb-3" />
            <Uploader multiple accept="audio" params={{ role: "MUSIC", license: license || undefined }} title="Prześlij utwory" onUploaded={() => router.refresh()} />
            {musicLibrary && <Button className="mt-3" size="sm" variant="secondary" onClick={async () => { const r = await api<{ imported: number }>("/api/assets/import-music", { method: "POST" }); toast.success(`Zaimportowano ${r.imported} utworów.`); router.refresh(); }}>Importuj skonfigurowaną bibliotekę muzyki</Button>}
          </Card>
          {groups.music.length ? <Card><ul className="divide-y divide-border">{groups.music.map((a) => row(a, <Input defaultValue={a.license ?? ""} placeholder="Licencja" className="h-8 w-56 text-xs" onBlur={(e) => e.target.value !== (a.license ?? "") && patch(a, { license: e.target.value || null })} />))}</ul></Card> : <EmptyState icon={Music2} title="Brak muzyki" />}
        </TabsContent>
        <TabsContent value="renders" className="mt-4">
          {groups.renders.length ? <Card><ul className="divide-y divide-border">{groups.renders.map((a) => row(a))}</ul></Card> : <EmptyState icon={FileVideo} title="Brak renderów" description="Wyrenderowane rolki MP4 pojawią się tutaj." />}
        </TabsContent>
        <TabsContent value="images" className="mt-4">
          {groups.images.length ? <Card><ul className="divide-y divide-border">{groups.images.map((a) => row(a))}</ul></Card> : <EmptyState icon={ImageIcon} title="Brak obrazów" description="Logo dodasz w profilu klienta, okładki w Export Studio." />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
