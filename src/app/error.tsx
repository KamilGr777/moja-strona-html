"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Coś poszło nie tak</h1>
      <p className="mt-2 max-w-md text-sm text-muted">{error.message || "Wystąpił nieoczekiwany błąd."}</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm text-white">Spróbuj ponownie</button>
    </div>
  );
}
