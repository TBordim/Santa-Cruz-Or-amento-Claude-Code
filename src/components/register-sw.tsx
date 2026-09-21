"use client";

import { useEffect } from "react";

// Registra /sw.js (ver comentário lá). Só em produção: em dev não há instalação de PWA a
// oferecer, e um SW registrado só atrapalharia o hot reload.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem SW o sistema funciona igual; só some a opção de instalar em Chrome antigo.
    });
  }, []);
  return null;
}
