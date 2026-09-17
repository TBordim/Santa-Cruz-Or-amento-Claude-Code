import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mesmas 4 famílias do painel atual (link do Google Fonts nas linhas 1-2 do HTML original),
// só que auto-hospedadas pelo next/font em vez de carregadas de fonts.googleapis.com — mesma
// identidade visual, sem a requisição externa a cada carregamento de página.
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
});
const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-ibm-plex-sans-condensed",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Orçamento Santa Cruz",
  description: "Sistema interno de orçamentos da Santa Cruz Ind. Gráfica",
  // apple-touch-icon e o título de tela cheia do iOS não vêm do manifest.ts (o Safari ignora
  // manifest para "Adicionar à Tela de Início") — precisam desses meta tags/links próprios.
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Orçamento SC",
  },
};

export const viewport: Viewport = {
  themeColor: "#B5502E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexSansCondensed.variable} ${ibmPlexMono.variable} ${fraunces.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
