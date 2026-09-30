import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import { AppHeader, BottomNav, Gate } from "@/components/AppChrome";
import { PREFS_BOOT_SCRIPT, Providers } from "@/components/providers";
import { OfflineBanner, ServiceWorker } from "@/components/ServiceWorker";
import { loadTrip } from "@/lib/data";
import { getViewer, serverSupabase } from "@/lib/supabase/server";
import "./globals.css";

const display = Shippori_Mincho({ weight: ["600", "800"], subsets: ["latin"], variable: "--font-display-face" });
const body = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: "Six Across Japan",
  description: "Private trip planner for six travellers, 20 Dec 2026 – 9 Jan 2027.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#11151c" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const sb = await serverSupabase();
  // Signed-out visitors only ever see /login (the proxy redirects the rest).
  const trip = await loadTrip(viewer && viewer !== "demo" ? sb : null);
  const me = viewer === "demo" ? "demo" : viewer ? { travellerId: viewer.travellerId, name: viewer.name, role: viewer.role } : null;

  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
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
