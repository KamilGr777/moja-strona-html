import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Nie znaleziono strony</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">Projekt mógł zostać usunięty albo link wygasł.</p>
      <Link href="/" className="mt-6 text-sm text-primary hover:underline">Wróć do dashboardu</Link>
    </div>
  );
}
