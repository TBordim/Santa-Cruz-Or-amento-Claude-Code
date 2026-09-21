// Service worker mínimo, só para o Chrome liberar "Instalar app" — versões antigas (até o 109,
// o último do Windows 7/8) exigem um SW com handler de fetch registrado pra oferecer a
// instalação. Não guarda nada em cache e não intercepta nenhuma requisição (o handler está
// vazio, então tudo segue direto pra rede) — o app se comporta exatamente como sem ele, sem
// risco de servir tela velha depois de um deploy nem de atrapalhar o login.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
