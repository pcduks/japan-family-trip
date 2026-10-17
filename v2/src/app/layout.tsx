import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces, Shippori_Mincho } from "next/font/google";
import Script from "next/script";
import { AppHeader, BottomNav } from "@/components/AppChrome";
import { Gate } from "@/components/Gate";
import { PREFS_BOOT_SCRIPT, Providers, type Me } from "@/components/providers";
import { loadSnapshot } from "@/lib/data/loader";
import { adminSupabase, getViewer } from "@/lib/supabase/server";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], axes: ["opsz", "SOFT"], weight: "variable", style: ["normal", "italic"], variable: "--font-display-face", display: "swap" });
/** Place names in Japanese on the map and the picture scroll; only the glyphs used are downloaded. */
const jp = Shippori_Mincho({ weight: ["500", "700"], preload: false, variable: "--font-jp", display: "swap" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Japan, winter 2026",
  description: "Our winter trip to Japan, 20 Dec 2026 – 9 Jan 2027: the route, the other routes, the places and the food.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#111522" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const sb = viewer && viewer !== "demo" ? adminSupabase() : null;
  const snapshot = await loadSnapshot(sb);
  const me: Me | null | "demo" = viewer === "demo" ? "demo" : viewer ? { travellerId: viewer.travellerId, name: viewer.name, role: viewer.role } : null;

  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${jp.variable}`}>
      <head>
        <Script id="prefs-boot" strategy="beforeInteractive">
          {PREFS_BOOT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-dvh antialiased">
        <Providers snapshot={snapshot} viewer={me}>
          {me ? <AppHeader /> : null}
          <div className={me ? "pb-24" : ""}>
            <Gate signedIn={!!me}>{children}</Gate>
          </div>
          {me ? <BottomNav /> : null}
        </Providers>
      </body>
    </html>
  );
}
