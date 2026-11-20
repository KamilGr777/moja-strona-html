"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SwitchRow } from "@/components/ui/switch";
import { uploadFile } from "@/lib/client/api";
import { FONT_FAMILIES } from "@/lib/timeline/types";
import { cn } from "@/lib/utils";

export interface FrameCandidate {
  url: string;
  label: string;
  score: number;
}

const W = 1080;
const H = 1920;

/** AI Thumbnail Generator: wybór najlepszego kadru + tytuł, kolory, kadrowanie, logo → PNG/JPG. */
export function ThumbnailEditor({ frames, projectId, logoUrl, brandColor }: { frames: FrameCandidate[]; projectId: string; logoUrl: string | null; brandColor: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);
  const [title, setTitle] = useState("Efekt, który robi różnicę");
  const [font, setFont] = useState<string>("Anton");
  const [size, setSize] = useState(120);
  const [color, setColor] = useState("#FFFFFF");
  const [accent, setAccent] = useState(brandColor ?? "#3D7BFF");
  const [ty, setTy] = useState(0.68);
  const [cx, setCx] = useState(0.5);
  const [cy, setCy] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [gradient, setGradient] = useState(true);
  const [logo, setLogo] = useState(Boolean(logoUrl));
  const [upper, setUpper] = useState(true);
  const [saving, setSaving] = useState(false);
  const img = useRef<HTMLImageElement | null>(null);
  const logoImg = useRef<HTMLImageElement | null>(null);

  const draw = async () => {
    const c = canvas.current;
    if (!c || !img.current) return;
    const ctx = c.getContext("2d")!;
    const im = img.current;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * zoom;
    const dw = im.naturalWidth * s;
    const dh = im.naturalHeight * s;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(im, -(dw - W) * cx, -(dh - H) * cy, dw, dh);
    if (gradient) {
      const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    const weight = font === "Poppins" || font === "Montserrat" ? 800 : 400;
    await document.fonts.load(`${weight} ${size}px "${font}"`);
    ctx.font = `${weight} ${size}px "${font}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = upper ? title.toLocaleUpperCase("pl-PL") : title;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > W * 0.84 && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    const lh = size * 1.12;
    const y0 = H * ty - ((lines.length - 1) * lh) / 2;
    // pasek akcentu
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 70, y0 - lh / 2 - 46, 140, 10);
    lines.forEach((l, i) => {
      ctx.lineWidth = size / 9;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineJoin = "round";
      ctx.strokeText(l, W / 2, y0 + i * lh);
      ctx.fillStyle = color;
      ctx.fillText(l, W / 2, y0 + i * lh);
    });
    if (logo && logoImg.current) {
      const lw = W * 0.26;
      const lh2 = (logoImg.current.naturalHeight / logoImg.current.naturalWidth) * lw;
      ctx.drawImage(logoImg.current, W / 2 - lw / 2, H * 0.12, lw, lh2);
    }
  };

  useEffect(() => {
    if (!frames[frame]) return;
    const im = new Image();
    im.onload = () => {
      img.current = im;
      void draw();
    };
    im.src = frames[frame].url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, frames]);
  useEffect(() => {
    if (!logoUrl) return;
    const im = new Image();
    im.onload = () => {
      logoImg.current = im;
      void draw();
    };
    im.src = logoUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl]);
  useEffect(() => {
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, font, size, color, accent, ty, cx, cy, zoom, gradient, logo, upper]);

  const blob = (type: "image/png" | "image/jpeg") => new Promise<Blob>((res) => canvas.current!.toBlob((b) => res(b!), type, 0.92));
  const download = async (type: "image/png" | "image/jpeg") => {
    const b = await blob(type);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `okladka.${type === "image/png" ? "png" : "jpg"}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!frames.length) return <p className="text-sm text-muted">Brak kadrów — dodaj klipy do projektu.</p>;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(220px,300px)_1fr]">
      <canvas ref={canvas} width={W} height={H} className="w-full rounded-xl border border-border bg-black" />
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Kadry (posortowane wg jakości — najlepszy pierwszy)</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((f, i) => (
              <button key={f.url} onClick={() => setFrame(i)} title={f.label} className={cn("relative shrink-0 overflow-hidden rounded-lg border-2", i === frame ? "border-primary" : "border-transparent")}>
                <img src={f.url} alt={f.label} className="h-24 w-14 object-cover" />
                {i === 0 && <Star className="absolute right-1 top-1 size-3 fill-warn text-warn" />}
              </button>
            ))}
          </div>
        </div>
        <Field label="Tytuł"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Czcionka"><Select value={font} onValueChange={setFont} options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))} /></Field>
          <Field label={`Wielkość: ${size}px`}><Slider value={size} onChange={(v) => setSize(Math.round(v))} min={60} max={200} step={2} /></Field>
          <label className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted">Kolor tytułu <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-6" /></label>
          <label className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted">Akcent marki <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="size-6" /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pozycja tytułu"><Slider value={ty} onChange={setTy} min={0.2} max={0.85} step={0.01} /></Field>
          <Field label="Powiększenie kadru"><Slider value={zoom} onChange={setZoom} min={1} max={2.5} step={0.01} /></Field>
          <Field label="Kadr poziomo"><Slider value={cx} onChange={setCx} min={0} max={1} step={0.01} /></Field>
          <Field label="Kadr pionowo"><Slider value={cy} onChange={setCy} min={0} max={1} step={0.01} /></Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <SwitchRow label="Gradient" checked={gradient} onCheckedChange={setGradient} />
          <SwitchRow label="WERSALIKI" checked={upper} onCheckedChange={setUpper} />
          {logoUrl && <SwitchRow label="Logo" checked={logo} onCheckedChange={setLogo} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => download("image/png")}><Download /> PNG</Button>
          <Button size="sm" variant="secondary" onClick={() => download("image/jpeg")}><Download /> JPG</Button>
          <Button size="sm" loading={saving} onClick={async () => {
            setSaving(true);
            try {
              await uploadFile(await blob("image/jpeg"), "okladka.jpg", { role: "THUMBNAIL", projectId });
              toast.success("Zapisano okładkę projektu.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}><Save /> Zapisz jako okładkę projektu</Button>
        </div>
      </div>
    </div>
  );
}
