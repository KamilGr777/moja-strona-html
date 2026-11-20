/**
 * Test end-to-end całej ścieżki na działającej aplikacji (npm run dev / start + npm run worker):
 * rejestracja → upload prawdziwego MP4 → analiza → „Popraw rolkę” (render + ponowna ocena)
 * → auto montaż z wielu klipów → render wariantu → pobranie MP4 i weryfikacja ffprobe.
 *
 * Użycie: npm run smoke  (opcjonalnie BASE_URL=http://localhost:3000)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let cookie = "";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drai-smoke-"));
const ff = (args: string[]) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

async function call<T>(method: string, url: string, body?: unknown, raw?: Buffer): Promise<T> {
  const res = await fetch(BASE + url, {
    method,
    headers: { cookie, ...(raw ? { "content-type": "application/octet-stream" } : body !== undefined ? { "content-type": "application/json" } : {}) },
    body: raw ? new Uint8Array(raw) : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}: ${data.error ?? ""}`);
  return data;
}

async function waitJob(id: string, label: string) {
  for (let i = 0; i < 300; i++) {
    const { job } = await call<{ job: { status: string; error: string | null; result: unknown } }>("GET", `/api/jobs/${id}`);
    if (job.status === "COMPLETED") return job;
    if (job.status === "FAILED" || job.status === "CANCELLED") throw new Error(`${label}: ${job.status} ${job.error}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label}: przekroczono czas oczekiwania`);
}

const step = (msg: string) => console.log(`\x1b[36m▸\x1b[0m ${msg}`);

async function main() {
  step(`Generowanie materiałów testowych (FFmpeg lavfi) w ${dir}`);
  const reel = path.join(dir, "reel.mp4");
  ff([
    "-f", "lavfi", "-i", "color=c=0x303035:size=1080x1920:rate=30:duration=4.5,noise=alls=3:allf=t",
    "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=3",
    "-f", "lavfi", "-i", "mandelbrot=size=1080x1920:rate=30",
    "-f", "lavfi", "-i", "sine=f=220:d=10.5",
    "-filter_complex", "[2:v]trim=duration=3,setpts=PTS-STARTPTS[m];[0:v][1:v][m]concat=n=3:v=1:a=0[v]",
    "-map", "[v]", "-map", "3:a", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", reel,
  ]);
  const clips = ["testsrc2=size=1920x1080:rate=30:duration=4", "mandelbrot=size=1080x1920:rate=30", "smptehdbars=size=1080x1920:rate=30:duration=3"].map((src, i) => {
    const out = path.join(dir, `clip${i}.mp4`);
    ff(["-f", "lavfi", "-i", src, "-t", "4", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", out]);
    return out;
  });

  step("Rejestracja użytkownika testowego");
  await call("POST", "/api/auth/register", { name: "Smoke Test", email: `smoke+${Date.now()}@detailreel.local`, password: "Smoke-test-123" });

  step("Analiza rolki: projekt → upload → analiza");
  const { project } = await call<{ project: { id: string } }>("POST", "/api/projects", { name: "Smoke — analiza", type: "ANALYSIS", goal: "leads", platform: "instagram", service: "correction" });
  const { asset } = await call<{ asset: { id: string } }>("PUT", `/api/upload?name=reel.mp4&role=SOURCE_REEL&projectId=${project.id}`, undefined, fs.readFileSync(reel));
  const { analysis, job } = await call<{ analysis: { id: string }; job: { id: string } }>("POST", "/api/analyses", { projectId: project.id, assetId: asset.id });
  await waitJob(job.id, "analiza");
  const rep = await call<{ analysis: { totalScore: number; mode: string; findings: unknown[]; asset: { scenes: unknown[] } } }>("GET", `/api/analyses/${analysis.id}`);
  console.log(`   wynik ${rep.analysis.totalScore}/100 (${rep.analysis.mode}), sceny: ${rep.analysis.asset.scenes.length}, uwagi: ${rep.analysis.findings.length}`);
  if (rep.analysis.asset.scenes.length < 3) throw new Error("Nie wykryto scen");

  step("Popraw rolkę z AI → render → ponowna ocena");
  const fix = await call<{ jobId: string; changes: string[] }>("POST", `/api/analyses/${analysis.id}/fix`, { targetDuration: 8, addCaptions: true, mode: "full", preset: "bold_viral" });
  fix.changes.forEach((c) => console.log(`   • ${c}`));
  await waitJob(fix.jobId, "render poprawionej wersji");

  step("AI Auto Montaż z 3 klipów (z wariantami A/B/C)");
  const mp = await call<{ project: { id: string } }>("POST", "/api/projects", { name: "Smoke — montaż", type: "AUTO_MONTAGE", platform: "tiktok", service: "ceramic" });
  for (const c of clips) await call("PUT", `/api/upload?name=${path.basename(c)}&role=RAW_CLIP&projectId=${mp.project.id}`, undefined, fs.readFileSync(c));
  const gen = await call<{ job: { id: string } }>("POST", `/api/montage/${mp.project.id}/generate`, { style: "viral", duration: "10-15", pace: "dynamic", goal: "views", withCaptions: true, variants: true });
  const done = await waitJob(gen.job.id, "auto montaż");
  const ids = (done.result as { editingProjectIds: string[] }).editingProjectIds;
  console.log(`   utworzono ${ids.length} projektów montażowych`);

  step("Render MP4 wariantu i pobranie pliku");
  const r = await call<{ jobId: string }>("POST", `/api/editing/${ids[0]}/render`, { quality: "draft", burnSubtitles: true, withLogo: true, loudnorm: true });
  const rj = await waitJob(r.jobId, "render");
  const exportId = (rj.result as { exportId: string }).exportId;
  const res = await fetch(`${BASE}/api/exports/${exportId}/download`, { headers: { cookie } });
  const out = path.join(dir, "export.mp4");
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", out]).toString();
  const p = JSON.parse(probe) as { streams: Array<{ codec_name: string; width?: number; height?: number }>; format: { duration: string } };
  const v = p.streams.find((s) => s.codec_name === "h264");
  if (!v || v.width !== 1080 || v.height !== 1920 || !p.streams.some((s) => s.codec_name === "aac")) throw new Error(`Nieprawidłowy eksport: ${probe}`);
  console.log(`   MP4: ${v.width}×${v.height} H.264 + AAC, ${Number(p.format.duration).toFixed(1)} s → ${out}`);

  console.log("\x1b[32m✔ Ścieżka end-to-end działa poprawnie\x1b[0m");
}

main().catch((e) => {
  console.error("\x1b[31m✘", (e as Error).message, "\x1b[0m");
  process.exit(1);
});
