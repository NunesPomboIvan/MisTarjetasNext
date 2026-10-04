import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Tarjetas",
    short_name: "Tarjetas",
    description: "Gestión personal de tarjetas de crédito y gastos",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a14",
    theme_color: "#0055A4",
    orientation: "portrait",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [],
  };
}
