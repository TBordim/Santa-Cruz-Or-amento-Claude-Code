import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O padrão do Next é 1 MB por Server Action. Os anexos (imagens comprimidas e PDFs) viajam
      // dentro da própria requisição; a Vercel corta em 4,5 MB, então 4 MB é o teto prático.
      // Anexos do Novo Orçamento ficam em 3,5 MB no total (ver src/lib/anexos/limites.ts).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
