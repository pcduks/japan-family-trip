import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppHeader, BottomNav } from "@/components/AppChrome";
import { PREFS_BOOT_SCRIPT, Providers, type Me } from "@/components/providers";
import { loadSnapshot } from "@/lib/data/loader";
import { getViewer, serverSupabase } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Japan trip planner",
  description: "Our winter trip to Japan, 20 Dec 2026 – 9 Jan 2027: versions, votes, places and the map.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#15171c" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const sb = viewer && viewer !== "demo" ? await serverSupabase() : null;
  const snapshot = await loadSnapshot(sb);
  const me: Me | null | "demo" = viewer === "demo" ? "demo" : viewer ? { travellerId: viewer.travellerId, name: viewer.name, role: viewer.role } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="prefs-boot" strategy="beforeInteractive">
          {PREFS_BOOT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-dvh antialiased">
        <Providers snapshot={snapshot} viewer={me}>
          {me ? <AppHeader /> : null}
          <div className={me ? "pb-24" : ""}>{children}</div>
          {me ? <BottomNav /> : null}
        </Providers>
      </body>
    </html>
  );
}
