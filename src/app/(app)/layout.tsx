import { requireUser } from "@/lib/auth";
import { aiEnabled, transcriptionEnabled } from "@/lib/env";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={{ name: user.name, email: user.email }} ai={{ enabled: aiEnabled(), transcription: transcriptionEnabled() }}>
      {children}
    </AppShell>
  );
}
