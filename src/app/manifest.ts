import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Six Across Japan",
    short_name: "Six in Japan",
    description: "Our Japan trip, 20 Dec 2026 – 9 Jan 2027",
    start_url: "/today",
    display: "standalone",
    background_color: "#f3f5f6",
    theme_color: "#1c2331",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
