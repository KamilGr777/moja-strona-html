import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

const inter = localFont({ src: "./fonts/InterVariable.ttf", variable: "--font-inter", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DETAIL REEL AI", template: "%s · DETAIL REEL AI" },
  description: "Inteligentna platforma AI do analizy i montażu rolek car detailing.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#08090c", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // motyw zapisany w ciasteczku (bez skryptu inline — brak migotania przy ładowaniu)
  const theme = (await cookies()).get("drai-theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="pl" className={inter.variable} data-theme={theme}>
      <body>
        {children}
        <Toaster theme={theme} position="bottom-right" toastOptions={{ style: { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--fg)" } }} />
      </body>
    </html>
  );
}
