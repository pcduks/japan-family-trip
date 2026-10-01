import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, Instrument_Serif, Klee_One, Zen_Kaku_Gothic_New, Zen_Maru_Gothic } from "next/font/google";
import { AppHeader, BottomNav, Gate } from "@/components/AppChrome";
import { PREFS_BOOT_SCRIPT, Providers } from "@/components/providers";
import { OfflineBanner, ServiceWorker } from "@/components/ServiceWorker";
import { loadTrip } from "@/lib/data";
import { getViewer, serverSupabase } from "@/lib/supabase/server";
import "./globals.css";

const display = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-display-face" });
const body = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono-face" });
const stamp = Zen_Maru_Gothic({ weight: ["500", "700", "900"], subsets: ["latin"], variable: "--font-stamp-face" });
const hand = Klee_One({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-hand-face" });

export const metadata: Metadata = {
  title: "Seis pelo Japão",
  description: "Nossa viagem em família ao Japão, 20 dez 2026 – 9 jan 2027.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#12161e" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const sb = await serverSupabase();
  // Signed-out visitors only ever see /login (the proxy redirects the rest).
  const trip = await loadTrip(viewer && viewer !== "demo" ? sb : null);
  const me = viewer === "demo" ? "demo" : viewer ? { travellerId: viewer.travellerId, name: viewer.name, role: viewer.role } : null;

  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable} ${stamp.variable} ${hand.variable}`}>
      <head>
        <Script id="prefs-boot" strategy="beforeInteractive">
          {PREFS_BOOT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-dvh antialiased">
        <Providers trip={trip} viewer={me}>
          <OfflineBanner />
          <ServiceWorker signedIn={!!me} />
          {me ? <AppHeader /> : null}
          <div className="pb-24">
            <Gate>{children}</Gate>
          </div>
          {me ? <BottomNav /> : null}
        </Providers>
      </body>
    </html>
  );
}
