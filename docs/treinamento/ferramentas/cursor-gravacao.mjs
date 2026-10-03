// Cursor falso (o headless não desenha o do sistema) + anel laranja ao clicar. Usado pelos scripts de gravação de tela.
// Copiado de gravar-tomadas-laboratorio.mjs.
// Cursor falso (headless não desenha o do sistema) + anel ao clicar.
export const CURSOR = (zoom) => {
  const init = () => {
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div");
    c.id = "__cur";
    c.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transform: "translate(-3px,-2px)" });
    document.documentElement.appendChild(c);
    const st = document.createElement("style");
    st.textContent = `.__ring{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #F47216;pointer-events:none;z-index:2147483646;animation:__r .5s ease-out forwards}@keyframes __r{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}`;
    document.documentElement.appendChild(st);
    const ult = JSON.parse(sessionStorage.getItem("__pos") || "null");
    if (ult) { c.style.left = ult[0] + "px"; c.style.top = ult[1] + "px"; }
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; sessionStorage.setItem("__pos", JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div"); r.className = "__ring";
      r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", init); else init();
};
