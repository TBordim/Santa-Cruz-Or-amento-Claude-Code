import type { MetadataRoute } from "next";

// Convenção de arquivo do Next.js — gera /manifest.webmanifest automaticamente e o App Router
// já injeta o <link rel="manifest"> no <head>, sem precisar editar layout.tsx pra isso.
// display: "standalone" é o que faz o navegador oferecer "Instalar app" e abrir numa janela
// própria (sem barra de endereço) em vez de numa aba comum.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orçamento Santa Cruz",
    short_name: "Orçamento SC",
    description: "Sistema interno de orçamentos da Santa Cruz Ind. Gráfica",
    start_url: "/",
    display: "standalone",
    background_color: "#EDE7DA",
    theme_color: "#B5502E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
