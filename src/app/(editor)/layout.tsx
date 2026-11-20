import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Edytor działa na pełnym ekranie (bez bocznego menu). */
export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-dvh bg-bg">{children}</div>;
}
