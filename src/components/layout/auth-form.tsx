"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/misc";
import { Logo } from "./logo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(fd)) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Nie udało się zalogować.");
    router.push("/");
    router.refresh();
  }
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 bg-grid">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[780px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-lg font-semibold">{mode === "login" ? "Zaloguj się" : "Utwórz konto"}</h1>
          <p className="mb-5 mt-1 text-sm text-muted">{mode === "login" ? "Analizuj i montuj rolki dla studiów detailingowych." : "Konto jest potrzebne do bezpiecznego przechowywania projektów."}</p>
          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "register" && (
              <Field label="Imię lub nazwa">
                <Input name="name" required minLength={2} autoComplete="name" placeholder="np. Kamil" />
              </Field>
            )}
            <Field label="E-mail">
              <Input name="email" type="email" required autoComplete="email" placeholder="ty@studio.pl" />
            </Field>
            <Field label="Hasło" hint={mode === "register" ? "Minimum 8 znaków." : undefined}>
              <Input name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </Field>
            {error && <Notice tone="bad">{error}</Notice>}
            <Button type="submit" className="w-full" size="lg" loading={loading}>{mode === "login" ? "Zaloguj" : "Załóż konto"}</Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (<>Nie masz konta? <Link href="/register" className="text-primary hover:underline">Zarejestruj się</Link></>) : (<>Masz już konto? <Link href="/login" className="text-primary hover:underline">Zaloguj się</Link></>)}
        </p>
      </div>
    </div>
  );
}
