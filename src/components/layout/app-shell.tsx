"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ScanSearch, Wand2, Clapperboard, Lightbulb, FolderOpen, Users, History, Settings, LogOut, Menu, X, Sparkles, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analysis", label: "Analiza rolek", icon: ScanSearch },
  { href: "/montage", label: "AI Auto Montaż", icon: Wand2 },
  { href: "/editor", label: "Edytor wideo", icon: Clapperboard },
  { href: "/ideas", label: "Generator pomysłów", icon: Lightbulb },
  { href: "/library", label: "Biblioteka nagrań", icon: FolderOpen },
  { href: "/clients", label: "Moi klienci", icon: Users },
  { href: "/projects", label: "Historia projektów", icon: History },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function AppShell({ user, ai, children }: { user: { name: string; email: string }; ai: { enabled: boolean; transcription: boolean }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition",
            isActive(n.href) ? "bg-primary/12 text-fg shadow-[inset_2px_0_0_var(--primary)]" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <n.icon className={cn("size-[17px]", isActive(n.href) ? "text-primary" : "text-subtle group-hover:text-muted")} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-2 p-3">
      <div className={cn("rounded-xl border px-3 py-2.5 text-xs", ai.enabled ? "border-primary/25 bg-primary/8" : "border-warn/25 bg-warn/8")}>
        <div className="flex items-center gap-1.5 font-semibold">
          {ai.enabled ? <Sparkles className="size-3.5 text-primary" /> : <Gauge className="size-3.5 text-warn" />}
          <span className={ai.enabled ? "text-[#a9c4ff]" : "text-warn"}>{ai.enabled ? "Analiza AI aktywna" : "Tryb heurystyczny"}</span>
        </div>
        <p className="mt-0.5 text-subtle">{ai.enabled ? (ai.transcription ? "Obraz + mowa (PL)" : "Obraz; transkrypcja wyłączona") : "Brak klucza AI — tylko pomiary techniczne"}</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5">
        <div className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3d7bff,#22d3ee)] text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{user.name}</p>
          <p className="truncate text-[11px] text-subtle">{user.email}</p>
        </div>
        <button onClick={logout} className="rounded-md p-1.5 text-subtle hover:bg-surface-2 hover:text-fg" aria-label="Wyloguj" title="Wyloguj">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-elevated/80 backdrop-blur lg:flex">
        <div className="px-5 pb-5 pt-5"><Link href="/"><Logo /></Link></div>
        {nav}
        {footer}
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-elevated/90 px-4 backdrop-blur lg:hidden">
        <Link href="/"><Logo id="lg-top" /></Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Menu"><Menu className="size-5" /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-border bg-elevated">
            <div className="flex items-center justify-between px-5 py-4"><Logo id="lg-drawer" /><button onClick={() => setOpen(false)} className="p-1 text-muted" aria-label="Zamknij menu"><X className="size-5" /></button></div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
