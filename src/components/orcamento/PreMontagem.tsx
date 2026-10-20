"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Layers } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-section";
import { MontagemSvg } from "@/components/orcamento/MontagemSvg";
import { FacaAbertaSvg } from "@/components/orcamento/FacaAbertaSvg";
import { Cubo3D } from "@/components/orcamento/Cubo3D";
import { calcularOpcoes, type Entrada, type FibraCartucho, type FibraMaquina, type Opcao } from "@/lib/montagem/calcular";
import { calcularComBerco } from "@/lib/montagem/berco";
import { conjugar } from "@/lib/montagem/conjugar";
import { facaFundoCartucho, OPCOES_FUNDO, OPCOES_TAMPA, type Cabeca, type Fechamento } from "@/lib/montagem/cartucho";
import { facaRetangular, type Arte, type Faca, type ModoArte } from "@/lib/montagem/geometria";
import { arteDaPagina, lerFacaDoPdf, type PdfJsLike } from "@/lib/montagem/pdf";
import { facaDaSalva, montarPreMontagemSalva, type PreMontagemSalva } from "@/lib/montagem/salva";
import { CONFIG } from "@/lib/montagem/config";
import { svgDaPreMontagem, svgParaImagem } from "@/lib/montagem/imagem";
import { adicionarAnexo, excluirAnexo } from "@/components/anexos/actions";
import { modelosDoDoc, textoMaterial } from "@/lib/orcamentos/modelos";
import { OPCOES_ANEXOS_ENGENHARIA } from "@/lib/orcamentos/constantes";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";

const selectCls =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm dark:bg-input/30";

// Máximo de modelos na mesma faca (as montagens reais chegam a 10 tipos).
const MAX_CONJUGADO = 12;
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// "30.000" (formato BR) -> 30000; aceita vírgula decimal nos campos em mm.
const qtdBR = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const mm = (s: string) => Number(s.replace(",", "."));

// "3/0" ou "2/1" -> maior número de cores de um lado.
function coresDoModelo(cores?: string): string {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec((cores ?? "").trim());
  return m ? String(Math.max(Number(m[1]), Number(m[2]))) : "";
}

// Preenche um campo do bloco "Suporte" do formulário da Engenharia (os campos se repetem uma vez
// por material, na ordem).
function preencher(nome: string, indice: number, valor: string) {
  const el = document.getElementsByName(nome)[indice] as HTMLInputElement | undefined;
  if (!el) return;
  el.value = valor;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Marca "Especificação GSC Montagem" em "Anexos previstos" do formulário da Engenharia (a caixa é
// um Checkbox: o clique atualiza o campo que vai junto com o formulário). Já marcada, não mexe.
function marcarMontagemEmAnexosPrevistos() {
  const alvo = OPCOES_ANEXOS_ENGENHARIA[0];
  const caixa = Array.from(document.querySelectorAll<HTMLButtonElement>('button[role="checkbox"]')).find((b) => b.value === alvo);
  if (caixa && caixa.getAttribute("aria-checked") !== "true") caixa.click();
}

// Lê uma imagem do computador e reduz para a prévia (a arte não sobe para lugar nenhum).
function lerImagem(arquivo: File): Promise<string> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 700 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => erro(new Error("imagem inválida"));
    img.src = URL.createObjectURL(arquivo);
  });
}

// A biblioteca de PDF só é carregada quando alguém lê um PDF (é grande). Versão "legacy" para
// funcionar também em navegadores mais antigos.
async function carregarPdfjs(): Promise<PdfJsLike> {
  const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  return lib as unknown as PdfJsLike;
}

async function faca_e_arte_do_pdf(dados: Uint8Array): Promise<{ faca: Faca; arte: string; resumo: string }> {
  const pdfjs = await carregarPdfjs();
  const { resultado, page } = await lerFacaDoPdf(pdfjs, dados);
  if (!resultado) throw new Error("Não achei a faca vetorial neste PDF.");
  const arte = await arteDaPagina(page, resultado.origemMm, resultado.faca.W, resultado.faca.H);
  return { faca: resultado.faca, arte, resumo: resultado.resumo };
}

// Encaixe entre as linhas, com o encontro das pontas: o primeiro encontro é o das duas primeiras linhas e,
// havendo mais linhas, os seguintes alternam (tampa com tampa, fundo com fundo, ...).
function descEncaixe(o: Opcao, curto = false): string {
  const a = o.arranjo;
  if (a.estrategia === "virada") {
    const tt = a.contato === "tampa-tampa";
    const base = curto ? (tt ? "tampa com tampa" : "fundo com fundo") : `${tt ? "tampa com tampa" : "fundo com fundo"} (linhas viradas 180°${a.rows > 2 ? ", o encontro seguinte alterna" : ""})`;
    return base;
  }
  return a.estrategia === "deslocada" ? "linhas deslocadas" : "grade simples";
}

type Aba = "opcoes" | "faca" | "conjugado";
type Origem = "pdf" | "generica" | "retangulo";

export function PreMontagem({ doc }: { doc: OrcamentoComAnexos }) {
  const c = doc.reqCliente as ReqCliente | null;
  const r = doc.reqTecnicos as ReqTecnicos | null;
  const materiais = c?.suportes ?? [];
  const modelos = modelosDoDoc(doc);
  const pdfsDaArte = doc.anexos.filter((a) => a.tipo === "ARTE" && a.mime === "application/pdf");
  const salvas = r?.preMontagem ?? {};

  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<Aba>("opcoes");
  const [origem, setOrigem] = useState<Origem>(pdfsDaArte.length ? "pdf" : "generica");
  const [medF, setMedF] = useState(c?.medidaF ?? "");
  const [medLs, setMedLs] = useState(c?.medidaL ?? "");
  const [medA, setMedA] = useState(c?.medidaA ?? "");
  const [cola, setCola] = useState("15");
  // Tampa e fundo do cartucho genérico (nomes do ERP) e o painel da cabeça de cada um.
  const [tampaIdx, setTampaIdx] = useState(0);
  const [fundoIdx, setFundoIdx] = useState(0);
  const [cabecaTampa, setCabecaTampa] = useState<Cabeca>("canto");
  const [cabecaFundo, setCabecaFundo] = useState<Cabeca>("meio");
  const [facaL, setFacaL] = useState("");
  const [facaA, setFacaA] = useState("");
  const [facaPdf, setFacaPdf] = useState<Faca | null>(null);
  // Berço (segunda faca na mesma folha, uma por caixa): vem de um segundo PDF.
  const [bercoFaca, setBercoFaca] = useState<Faca | null>(null);
  const [bercoInfo, setBercoInfo] = useState<string | null>(null);
  const [bercoLendo, setBercoLendo] = useState(false);
  const [bercoErro, setBercoErro] = useState<string | null>(null);
  const [infoPdf, setInfoPdf] = useState<string | null>(null);
  const [lendoPdf, setLendoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState<string | null>(null);
  const [anexoId, setAnexoId] = useState(pdfsDaArte[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState(c?.quantidadesLista?.[0] ?? "");
  const [cores, setCores] = useState(coresDoModelo(modelos[0]?.cores));
  const [espessura, setEspessura] = useState("");
  const [fibra, setFibra] = useState<FibraCartucho>("livre");
  const [fibraMaq, setFibraMaq] = useState<FibraMaquina>("74");
  const [barra, setBarra] = useState(true);
  const [pinca, setPinca] = useState(String(CONFIG.pincaMm));
  const [manual, setManual] = useState(false);
  const [seco, setSeco] = useState(false);
  // Quando as linhas se alternam viradas 180°: que pontas se encostam primeiro (tampa com tampa é o mais comum).
  const [contatoPref, setContatoPref] = useState<"tampa" | "fundo" | "tanto">("tampa");
  // Num PDF de cliente, qual ponta do desenho é a tampa.
  const [tampaNoTopo, setTampaNoTopo] = useState(true);
  const [acerto, setAcerto] = useState("");
  const [material, setMaterial] = useState(0);
  const [sobMedida, setSobMedida] = useState(true);
  const [sel, setSel] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [anexando, setAnexando] = useState(false);
  // Última imagem gerada: fica disponível para baixar, mesmo que o anexo automático falhe.
  const [imagem, setImagem] = useState<{ url: string; nome: string } | null>(null);
  const pathname = usePathname();
  const [arteUrl, setArteUrl] = useState<string | null>(null);
  const [modoArte, setModoArte] = useState<ModoArte>("toda");
  const [erroArte, setErroArte] = useState<string | null>(null);
  const [conj, setConj] = useState(() => [0, 1, 2].map((i) => ({ nome: modelos[i]?.descricao || `Modelo ${i + 1}`, qtd: "" })));
  // JSON da pré-montagem aprovada, enviado junto com o formulário da Engenharia.
  const [pendente, setPendente] = useState("");
  const salvarAoRenderizar = useRef(false);

  const arte: Arte | null = arteUrl ? { url: arteUrl, modo: modoArte } : null;

  // Depois de aprovar, o campo escondido já está no formulário: grava o card.
  useEffect(() => {
    if (salvarAoRenderizar.current && pendente) {
      salvarAoRenderizar.current = false;
      (document.getElementById("form-engenharia") as HTMLFormElement | null)?.requestSubmit();
    }
  }, [pendente]);

  const faca = useMemo(() => {
    if (origem === "pdf") return facaPdf && !tampaNoTopo ? { ...facaPdf, tampaNoTopo: false } : facaPdf;
    if (origem === "retangulo") {
      const L = mm(facaL);
      const A = mm(facaA);
      return L > 0 && A > 0 ? facaRetangular(L, A) : null;
    }
    const F = mm(medF);
    const Ls = mm(medLs);
    const A = mm(medA);
    const g = mm(cola);
    const fecho: Fechamento = {
      tampa: { tipo: OPCOES_TAMPA[tampaIdx].tipo, cabeca: cabecaTampa },
      fundo: { tipo: OPCOES_FUNDO[fundoIdx].tipo, cabeca: cabecaFundo },
      nomes: { tampa: OPCOES_TAMPA[tampaIdx].nome, fundo: OPCOES_FUNDO[fundoIdx].nome },
    };
    return F >= 25 && Ls >= 10 && A > 0 && g >= 5 ? facaFundoCartucho(F, Ls, A, g, fecho) : null;
  }, [origem, facaPdf, tampaNoTopo, facaL, facaA, medF, medLs, medA, cola, tampaIdx, fundoIdx, cabecaTampa, cabecaFundo]);

  const entrada: Omit<Entrada, "faca"> | null = useMemo(() => {
    const q = qtdBR(quantidade);
    const nCores = Number(cores);
    const esp = mm(espessura);
    if (!(q > 0) || !(nCores > 0) || !(esp > 0)) return null;
    return {
      quantidade: q,
      cores: nCores,
      espessuraMm: esp,
      fibraCartucho: fibra,
      fibraMaquina: fibraMaq,
      barraControle: barra,
      corteSeco: seco,
      contatoPreferido: contatoPref === "tanto" ? null : contatoPref,
      incluirSobMedida: sobMedida,
      permitirCorteManual: manual,
      pincaMm: mm(pinca) > 0 ? mm(pinca) : undefined,
    };
  }, [quantidade, cores, espessura, fibra, fibraMaq, barra, seco, contatoPref, sobMedida, manual, pinca]);

  // Com berço, cada pose da folha leva uma caixa e o seu berço (peça composta) e o corte é sempre duplo.
  const resultado = useMemo(() => {
    if (!faca || !entrada) return null;
    if (bercoFaca) {
      const r = calcularComBerco(entrada, faca, bercoFaca);
      return { opcoes: r.opcoes, maquinas: r.maquinas, avisos: r.avisos, facas: r.faca as Map<Opcao, Faca> | null };
    }
    return { ...calcularOpcoes({ ...entrada, faca }), facas: null as Map<Opcao, Faca> | null };
  }, [faca, entrada, bercoFaca]);
  // Peça que a opção usa na folha: a composta (caixa + berço) ou a própria faca.
  const facaDe = (o: Opcao): Faca => resultado?.facas?.get(o) ?? faca!;
  // Mostra as 5 melhores folhas sob medida e a melhor opção de cada formato padrão em estoque (para nenhum
  // formato ficar de fora), na ordem de aproveitamento.
  const opcoes = useMemo(() => {
    const todas = resultado?.opcoes ?? [];
    let sob = 0;
    const formatos = new Set<string>();
    return todas.filter((o) => {
      if (o.sobMedida) return sob++ < 5;
      const k = `${o.formato.w}x${o.formato.h}`;
      if (formatos.has(k)) return false;
      formatos.add(k);
      return true;
    });
  }, [resultado]);
  const op: Opcao | undefined = opcoes[Math.min(sel, Math.max(opcoes.length - 1, 0))];

  const conjugado = useMemo(() => {
    if (!op) return null;
    const lista = conj.filter((m) => qtdBR(m.qtd) > 0).map((m) => ({ nome: m.nome, quantidade: qtdBR(m.qtd) }));
    return lista.length >= 2 ? { feito: conjugar(op.posesPorFator, lista, CONFIG.toleranciaAcima) } : null;
  }, [op, conj]);

  async function aoEscolherArte(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErroArte(null);
    try {
      setArteUrl(await lerImagem(arquivo));
    } catch {
      setErroArte("Não consegui ler este arquivo. Use uma imagem PNG ou JPG.");
    }
  }

  async function usarPdf(dados: Uint8Array) {
    setLendoPdf(true);
    setErroPdf(null);
    try {
      const { faca: f, arte: a, resumo } = await faca_e_arte_do_pdf(dados);
      setFacaPdf(f);
      setArteUrl(a);
      setModoArte("toda");
      setInfoPdf(resumo);
      setSel(0);
    } catch (e) {
      setErroPdf(e instanceof Error ? e.message : "Não consegui ler este PDF.");
    } finally {
      setLendoPdf(false);
    }
  }

  async function lerAnexo() {
    const a = pdfsDaArte.find((x) => x.id === anexoId);
    if (!a) return;
    setLendoPdf(true);
    setErroPdf(null);
    try {
      const resp = await fetch(a.url);
      if (!resp.ok) throw new Error("Não consegui baixar o PDF anexado.");
      await usarPdf(new Uint8Array(await resp.arrayBuffer()));
    } catch (e) {
      setLendoPdf(false);
      setErroPdf(e instanceof Error ? `${e.message} Escolha o arquivo no seu computador.` : "Não consegui baixar o PDF anexado.");
    }
  }

  async function aoEscolherBerco(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setBercoLendo(true);
    setBercoErro(null);
    try {
      const pdfjs = await carregarPdfjs();
      const { resultado: lido } = await lerFacaDoPdf(pdfjs, new Uint8Array(await arquivo.arrayBuffer()));
      if (!lido) throw new Error("Não achei a faca vetorial neste PDF do berço.");
      setBercoFaca(lido.faca);
      setBercoInfo(`${arquivo.name}: ${fmt(lido.faca.W)} × ${fmt(lido.faca.H)} mm`);
      setSel(0);
    } catch (err) {
      setBercoErro(err instanceof Error ? err.message : "Não consegui ler o PDF do berço.");
    } finally {
      setBercoLendo(false);
    }
  }

  async function aoEscolherPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (arquivo) await usarPdf(new Uint8Array(await arquivo.arrayBuffer()));
  }

  // Reabre o que a Engenharia aprovou antes neste material.
  function carregarSalva(s: PreMontagemSalva) {
    setMaterial(s.materialIdx);
    setQuantidade(String(s.entrada.quantidade));
    setCores(String(s.entrada.cores));
    setEspessura(String(s.entrada.espessuraMm).replace(".", ","));
    setFibra(s.entrada.fibraCartucho);
    setFibraMaq(s.entrada.fibraMaquina);
    setBarra(s.entrada.barraControle);
    setSeco(s.entrada.corteSeco);
    setContatoPref(s.entrada.contatoPreferido === undefined ? "tampa" : s.entrada.contatoPreferido ?? "tanto");
    setTampaNoTopo(s.faca.tampaNoTopo !== false);
    setManual(s.entrada.permitirCorteManual === true);
    setPinca(String(s.entrada.pincaMm ?? CONFIG.pincaMm));
    setSobMedida(s.entrada.incluirSobMedida !== false);
    const f = facaDaSalva(s);
    setBercoFaca(null);
    setBercoInfo(null);
    if (f.origem === "pdf") {
      setOrigem("pdf");
      setFacaPdf(f);
      setInfoPdf("Faca da pré-montagem aprovada (a arte precisa ser lida de novo).");
    } else if (f.origem === "generica" && f.medidas) {
      setOrigem("generica");
      setMedF(String(f.medidas.F));
      setMedLs(String(f.medidas.Ls));
      setMedA(String(f.medidas.A));
      setCola(String(f.medidas.xs[1]));
      if (f.fechamento) {
        const ti = OPCOES_TAMPA.findIndex((o) => o.nome === f.fechamento?.nomes?.tampa);
        const fi = OPCOES_FUNDO.findIndex((o) => o.nome === f.fechamento?.nomes?.fundo);
        setTampaIdx(ti >= 0 ? ti : Math.max(0, OPCOES_TAMPA.findIndex((o) => o.tipo === f.fechamento?.tampa.tipo)));
        setFundoIdx(fi >= 0 ? fi : Math.max(0, OPCOES_FUNDO.findIndex((o) => o.tipo === f.fechamento?.fundo.tipo)));
        setCabecaTampa(f.fechamento.tampa.cabeca);
        setCabecaFundo(f.fechamento.fundo.cabeca);
      }
    } else {
      setOrigem("retangulo");
      setFacaL(String(f.W));
      setFacaA(String(f.H));
    }
    setSel(0);
  }

  // Gera a imagem da pré-montagem aprovada e a anexa ao card (Anexos da Engenharia), para os outros
  // setores verem. A imagem anterior do mesmo material é trocada pela nova.
  async function anexarImagem(o: Opcao, f: Faca, ent: Omit<Entrada, "faca">, maquinas: string[], idxMaterial: number): Promise<boolean> {
    setAnexando(true);
    try {
      const mat = materiais[idxMaterial];
      const so = doc.numeroSequencial ? `SO ${doc.numeroSequencial} — ` : "";
      const produto = modelos.length > 1 ? `${modelos.length} modelos na mesma faca` : modelos[0]?.descricao || doc.produtoDescricao || "";
      const cm = (mmv: number) => fmt(mmv / 10);
      const linhas: [string, string][] = [
        ["Material", mat ? textoMaterial(mat) : `Material ${idxMaterial + 1}`],
        ["Formato da folha (fibra no 2º número)", `${cm(o.formato.w)} × ${cm(o.formato.h)} cm, fibra no ${cm(o.formato.h)} · ${o.sobMedida ? `sob medida (~${o.prazoDias} dias)` : "padrão em estoque"}`],
        ["Corte", `${o.corte} (${o.cortesLargura} × ${o.cortesAltura})`],
        ["Fator C × L (fibra no 2º número, a Largura)", `${cm(o.wf)} × ${cm(o.hf)} cm, fibra no ${cm(o.hf)}`],
        ["Poses por fator", String(o.posesPorFator)],
        ["Peças por folha inteira", String(o.pecasPorFolha)],
        ["Folhas de produção", fmt(o.folhas, 0)],
        ["Quantidade pedida", fmt(ent.quantidade, 0)],
        ["Peças produzidas", `${fmt(o.pecasProduzidas, 0)} (${o.excesso >= 0 ? "+" : ""}${fmt(o.excesso * 100, 2)}%)`],
        ["Aproveitamento do fator", `${fmt(o.aproveitamento * 100)}%`],
        ...(f.partes ? [["Berço", "1 por caixa, na mesma folha (corte duplo)"] as [string, string]] : []),
        ["Encaixe", `${descEncaixe(o)}${o.arranjo.tijolo ? ", em tijolo" : ""}${o.girada90 ? " · girada 90°" : ""}`],
        ["Corte entre peças", ent.corteSeco ? "seco (lâmina compartilhada)" : "duplo (lâminas separadas)"],
        ["Fibra do papel na máquina", ent.fibraMaquina === "74" ? "no sentido do 74" : "no sentido do 53"],
        ["Fibra pedida pelo cliente", ent.fibraCartucho === "livre" ? "livre" : ent.fibraCartucho === "altura" ? "paralela à altura" : "paralela à largura"],
        ["Pinça / barra de controle", `${o.pincaMm} mm / ${ent.barraControle ? `${o.barraMm} mm` : "sem barra"}`],
        ["Corte e vinco", o.exigeCorteManual ? "manual ou guilhotina (fator menor que 32 × 40 cm)" : "automática (Bobst)"],
        ["Perda de papel no interior", `${fmt(o.perdaInterior * 100, 2)}%`],
        ["Corte a corte (fibra no 2º número)", `${fmt(o.corteACorteW / 10)} × ${fmt(o.corteACorteH / 10)} cm, fibra no ${fmt(o.corteACorteH / 10)}`],
        ["Total de lâminas (estim.)", `${fmt(o.laminaMm / 1000, 2)} m · ${brl(o.custoFaca)}`],
        ["Máquina", maquinas.join(" ou ") || "—"],
        ["Cores · espessura", `${ent.cores} · ${fmt(ent.espessuraMm, 2)} mm`],
      ];
      const agora = new Date();
      const svg = svgDaPreMontagem({
        titulo: `${so}${doc.cliente ?? ""}`,
        subtitulo: [produto, `Material ${idxMaterial + 1}`].filter(Boolean).join(" · "),
        aprovadaEm: agora.toLocaleString("pt-BR"),
        op: o,
        faca: f,
        arte: arteUrl && !f.partes ? { url: arteUrl, modo: modoArte } : null,
        barraControle: ent.barraControle,
        linhas,
      });
      const { blob, extensao } = await svgParaImagem(svg);
      const nomeBase = `Pre-montagem - Material ${idxMaterial + 1} - ${cm(o.formato.w)}x${cm(o.formato.h)} corte ${o.corte}`.replace(/,/g, ".");
      setImagem((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior.url);
        return { url: URL.createObjectURL(blob), nome: `${nomeBase}.${extensao}` };
      });
      for (const a of doc.anexos.filter((x) => x.tipo === "ENGENHARIA" && x.nome.startsWith(`Pre-montagem - Material ${idxMaterial + 1} `))) {
        const fd = new FormData();
        fd.set("id", a.id);
        fd.set("caminho", pathname);
        await excluirAnexo(fd);
      }
      const fd = new FormData();
      fd.set("orcamentoId", doc.id);
      fd.set("tipo", "ENGENHARIA");
      fd.set("caminho", pathname);
      fd.set("arquivo", new File([blob], `${nomeBase}.${extensao}`, { type: blob.type }));
      await adicionarAnexo(fd);
      setAviso(`Pré-montagem aprovada: campos do Material ${idxMaterial + 1} preenchidos, imagem anexada em "Anexos da Engenharia" e "${OPCOES_ANEXOS_ENGENHARIA[0]}" marcada em Anexos previstos. Gravando o card…`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro desconhecido";
      const semArmazenamento = /blob|credential|token/i.test(msg);
      setAviso(
        semArmazenamento
          ? 'Pré-montagem aprovada e gravada, mas a imagem não foi anexada: o armazenamento de arquivos (Vercel Blob) não está configurado neste ambiente (falta o BLOB_READ_WRITE_TOKEN). Baixe a imagem abaixo e anexe em "Anexos da Engenharia" quando o armazenamento estiver ativo.'
          : `Pré-montagem aprovada e gravada, mas a imagem não foi anexada: ${msg}. Baixe a imagem abaixo e anexe manualmente em "Anexos da Engenharia".`,
      );
      return false;
    } finally {
      setAnexando(false);
    }
  }

  function aprovar() {
    if (!op || !faca || !entrada || !resultado) return;
    const fOp = facaDe(op);
    const entradaOp = fOp.partes ? { ...entrada, corteSeco: false } : entrada;
    preencher("suporteTecFormato", material, `${fmt(op.formato.w / 10)} x ${fmt(op.formato.h / 10)}`);
    preencher("suporteTecCorte", material, String(op.corte));
    // Regra da fibra: o segundo número é o da fibra. Comprimento = fora da fibra, Largura = na fibra.
    preencher("suporteTecFatorC", material, fmt(op.wf / 10));
    preencher("suporteTecFatorL", material, fmt(op.hf / 10));
    preencher("suporteTecQtdCh", material, String(op.posesPorFator));
    preencher("suporteTecQtdFolha", material, String(op.pecasPorFolha));
    if (Number(acerto) > 0) preencher("suporteTecFlsAcerto", material, acerto);
    if (op.sobMedida) {
      preencher("suporteTecIdealC", material, fmt(op.formato.w / 10));
      preencher("suporteTecIdealL", material, fmt(op.formato.h / 10));
    }
    const salva = montarPreMontagemSalva({ materialIdx: material, entrada: { ...entradaOp, faca: fOp }, op, maquinas: resultado.maquinas.map((m) => m.nome) });
    const json = JSON.stringify(salva);
    setAviso(`Pré-montagem aprovada: campos do Material ${material + 1} preenchidos. Gerando a imagem para os anexos…`);
    setAberto(false);
    // O card só é gravado depois do anexo: se a imagem foi anexada, "Anexos previstos" já vai marcado.
    void anexarImagem(op, fOp, entradaOp, resultado.maquinas.map((m) => m.nome), material).then((anexou) => {
      if (anexou) marcarMontagemEmAnexosPrevistos();
      salvarAoRenderizar.current = true;
      setPendente(json);
    });
  }

  const abaCls = (a: Aba) => `rounded-lg border px-3 py-1.5 text-sm ${aba === a ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"}`;
  const salvaAtual = salvas[String(material)];

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="preMontagem" form="form-engenharia" value={pendente} readOnly />

      {Object.values(salvas).map((s) => (
        <div key={s.materialIdx} className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-sm">
          <strong>Pré-montagem aprovada — Material {s.materialIdx + 1}</strong>{" "}
          <span className="text-muted-foreground">em {new Date(s.aprovadaEm).toLocaleString("pt-BR")}</span>
          <br />
          Folha {fmt((s.escolha.ideal && s.formatoEscolhido === "ideal" ? s.escolha.ideal.w : s.escolha.folhaW) / 10)} × {fmt((s.escolha.ideal && s.formatoEscolhido === "ideal" ? s.escolha.ideal.h : s.escolha.folhaH) / 10)} cm, fibra no {fmt((s.escolha.ideal && s.formatoEscolhido === "ideal" ? s.escolha.ideal.h : s.escolha.folhaH) / 10)} (
          {s.formatoEscolhido === "ideal" ? "sob medida" : "padrão em estoque"}) · corte {s.escolha.corte} · {s.escolha.posesPorFator} poses/fator · {s.escolha.pecasPorFolha} peças/folha ·{" "}
          {fmt(s.escolha.aproveitamento * 100)}% de aproveitamento · faca {brl(s.escolha.custoFaca)} ({fmt(s.escolha.laminaMm / 1000, 1)} m)
        </div>
      ))}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-fit">
            <Layers className="mr-1.5 size-4" /> {Object.keys(salvas).length ? "Refazer pré-montagem" : "Gerar pré-montagem"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Pré-montagem</DialogTitle>
            <DialogDescription>Sugestão rápida de formato, corte e poses por folha para o orçamento. O desenho final continua no ArtiosCAD.</DialogDescription>
          </DialogHeader>

          {salvaAtual && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-sm">
              <span>Há uma pré-montagem aprovada para o Material {material + 1}.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => carregarSalva(salvaAtual)}>
                Carregar os dados dela
              </Button>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <div className="flex flex-col gap-3">
              <Field label="Faca aberta">
                <select className={selectCls} value={origem} onChange={(e) => setOrigem(e.target.value as Origem)}>
                  <option value="pdf">Contorno real, lido do PDF da arte</option>
                  <option value="generica">Fundo cartucho genérico (fórmulas de exemplo)</option>
                  <option value="retangulo">Retângulo (largura × altura)</option>
                </select>
              </Field>
              {origem === "pdf" && (
                <div className="flex flex-col gap-2 rounded-lg border p-2.5">
                  {pdfsDaArte.length > 0 && (
                    <>
                      <select className={selectCls} value={anexoId} onChange={(e) => setAnexoId(e.target.value)}>
                        {pdfsDaArte.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                          </option>
                        ))}
                      </select>
                      <Button type="button" size="sm" disabled={lendoPdf} onClick={lerAnexo}>
                        {lendoPdf ? "Lendo o PDF…" : "Ler a faca do PDF anexado"}
                      </Button>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground">{pdfsDaArte.length ? "Ou escolha um PDF no seu computador:" : "Escolha o PDF da arte (com a faca em vetor):"}</div>
                  <input type="file" accept="application/pdf" onChange={aoEscolherPdf} className="text-sm" disabled={lendoPdf} />
                  <div className="mt-2 rounded-md border border-dashed p-2">
                    <div className="text-xs font-medium">Berço (opcional): segundo PDF com a faca do berço, um por caixa, na mesma folha</div>
                    <input type="file" accept="application/pdf" onChange={aoEscolherBerco} className="mt-1 text-sm" disabled={bercoLendo || !facaPdf} />
                    {!facaPdf && <p className="text-xs text-muted-foreground">Leia primeiro a faca da caixa.</p>}
                    {bercoInfo && bercoFaca && (
                      <p className="text-xs text-muted-foreground">
                        {bercoInfo}.{" "}
                        <button type="button" className="underline" onClick={() => { setBercoFaca(null); setBercoInfo(null); }}>
                          Tirar o berço
                        </button>
                      </p>
                    )}
                    {bercoErro && <p className="text-xs text-destructive">{bercoErro}</p>}
                  </div>
                  {infoPdf && <p className="text-xs text-muted-foreground">{infoPdf}. A leitura é automática: confira o contorno na aba “Faca aberta e 3D”.</p>}
                  {erroPdf && <p className="text-xs text-destructive">{erroPdf}</p>}
                </div>
              )}
              {origem === "generica" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Frente (mm)">
                      <Input inputMode="decimal" value={medF} onChange={(e) => setMedF(e.target.value)} />
                    </Field>
                    <Field label="Lateral (mm)">
                      <Input inputMode="decimal" value={medLs} onChange={(e) => setMedLs(e.target.value)} />
                    </Field>
                    <Field label="Altura (mm)">
                      <Input inputMode="decimal" value={medA} onChange={(e) => setMedA(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Aba de cola (mm)" hint="Exemplo. As fórmulas reais de cada modelo virão da Engenharia.">
                    <Input inputMode="decimal" value={cola} onChange={(e) => setCola(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tampa">
                      <select className={selectCls} value={tampaIdx} onChange={(e) => setTampaIdx(Number(e.target.value))}>
                        {OPCOES_TAMPA.map((o, i) => (
                          <option key={o.nome} value={i}>
                            {o.nome}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fundo">
                      <select className={selectCls} value={fundoIdx} onChange={(e) => setFundoIdx(Number(e.target.value))}>
                        {OPCOES_FUNDO.map((o, i) => (
                          <option key={o.nome} value={i}>
                            {o.nome}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cabeça da tampa" hint="Canto: painel ao lado da aba de cola.">
                      <select className={selectCls} value={cabecaTampa} onChange={(e) => setCabecaTampa(e.target.value as Cabeca)}>
                        <option value="canto">Canto</option>
                        <option value="meio">Meio</option>
                      </select>
                    </Field>
                    <Field label="Cabeça do fundo" hint="Só vale para fundo de encaixe (americano ou asa de avião).">
                      <select className={selectCls} value={cabecaFundo} onChange={(e) => setCabecaFundo(e.target.value as Cabeca)}>
                        <option value="canto">Canto</option>
                        <option value="meio">Meio</option>
                      </select>
                    </Field>
                  </div>
                  {[OPCOES_TAMPA[tampaIdx], OPCOES_FUNDO[fundoIdx]].some((o) => o.aproximado) && (
                    <p className="rounded-md border border-amber-400/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      Desenho aproximado:{" "}
                      {[
                        OPCOES_TAMPA[tampaIdx].aproximado && `tampa “${OPCOES_TAMPA[tampaIdx].nome}”, ${OPCOES_TAMPA[tampaIdx].aproximado}`,
                        OPCOES_FUNDO[fundoIdx].aproximado && `fundo “${OPCOES_FUNDO[fundoIdx].nome}”, ${OPCOES_FUNDO[fundoIdx].aproximado}`,
                      ]
                        .filter(Boolean)
                        .join("; ")}
                      . Confira com a Engenharia.
                    </p>
                  )}
                  {faca && (
                    <div className="rounded-lg border p-2">
                      <div className="mb-1 text-xs text-muted-foreground">Faca aberta, com as medidas e o tipo de tampa e fundo escolhidos (muda ao ajustar):</div>
                      <div className="mx-auto max-w-md">
                        <FacaAbertaSvg faca={faca} arte={null} />
                      </div>
                    </div>
                  )}
                </>
              )}
              {origem === "retangulo" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Largura (mm)">
                    <Input inputMode="decimal" value={facaL} onChange={(e) => setFacaL(e.target.value)} placeholder="ex.: 155,6" />
                  </Field>
                  <Field label="Altura (mm)">
                    <Input inputMode="decimal" value={facaA} onChange={(e) => setFacaA(e.target.value)} placeholder="ex.: 187,2" />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantidade (peças)">
                  <Input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                </Field>
                <Field label="Nº de cores">
                  <Input inputMode="numeric" value={cores} onChange={(e) => setCores(e.target.value)} />
                </Field>
                <Field label="Espessura do cartão (mm)">
                  <Input inputMode="decimal" value={espessura} onChange={(e) => setEspessura(e.target.value)} placeholder="ex.: 0,4" />
                </Field>
                <Field label="Folhas de acerto" hint="Só preenche o campo se informado.">
                  <Input inputMode="numeric" value={acerto} onChange={(e) => setAcerto(e.target.value)} />
                </Field>
              </div>
              <Field label="Fibra pedida pelo cliente">
                <select className={selectCls} value={fibra} onChange={(e) => setFibra(e.target.value as FibraCartucho)}>
                  <option value="livre">Livre</option>
                  <option value="altura">Paralela à altura do cartucho</option>
                  <option value="largura">Paralela à largura do cartucho</option>
                </select>
              </Field>
              <Field label="Fibra do papel na máquina">
                <select className={selectCls} value={fibraMaq} onChange={(e) => setFibraMaq(e.target.value as FibraMaquina)}>
                  <option value="74">No sentido do 74 (padrão de compra)</option>
                  <option value="53">No sentido do 53 (passagem)</option>
                </select>
              </Field>
              <Field
                label="Corte entre peças vizinhas"
                hint={`No sentido da aba de cola os cartuchos sempre se encostam. Duplo: ${CONFIG.espacoFacasMm} mm entre as facas, e a tampa pode encontrar o fundo ou outra tampa. Seco: lâmina compartilhada, só pontas iguais (tampa com tampa ou fundo com fundo, linhas viradas 180°).`}
              >
                <select className={selectCls} value={seco ? "seco" : "duplo"} onChange={(e) => setSeco(e.target.value === "seco")}>
                  <option value="duplo">Corte duplo (lâminas separadas)</option>
                  <option value="seco">Corte seco (lâmina compartilhada)</option>
                </select>
              </Field>
              <Field label="Encostar entre os cartuchos" hint="Quando as linhas se alternam viradas 180°. Só desempata: nunca custa peças. Com 3 ou mais linhas os encontros alternam.">
                <select className={selectCls} value={contatoPref} onChange={(e) => setContatoPref(e.target.value as "tampa" | "fundo" | "tanto")}>
                  <option value="tampa">Tampa com tampa (mais comum)</option>
                  <option value="fundo">Fundo com fundo</option>
                  <option value="tanto">Tanto faz</option>
                </select>
              </Field>
              {origem === "pdf" && (
                <Field label="Qual ponta do desenho é a tampa?" hint="Vale para o PDF do cliente. Confira na aba “Faca aberta e 3D”.">
                  <select className={selectCls} value={tampaNoTopo ? "topo" : "base"} onChange={(e) => setTampaNoTopo(e.target.value === "topo")}>
                    <option value="topo">A de cima do desenho</option>
                    <option value="base">A de baixo do desenho</option>
                  </select>
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sobMedida} onChange={(e) => setSobMedida(e.target.checked)} className="size-4" />
                Considerar folha sob medida (cerca de {CONFIG.formatoIdeal.prazoDias} dias)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={barra} onChange={(e) => setBarra(e.target.checked)} className="size-4" />
                Barra de controle de cores ({CONFIG.barraControleMm} mm)
              </label>
              <Field label="Pinça (mm)" hint={`Mínima ${CONFIG.pincaMm} mm. Aumente se a Engenharia pedir mais.`}>
                <Input inputMode="decimal" value={pinca} onChange={(e) => setPinca(e.target.value)} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} className="mt-0.5 size-4" />
                <span>
                  Aceitar fator menor que {CONFIG.bobstAutomatica.passagemMin / 10} × {CONFIG.bobstAutomatica.transversalMin / 10} cm (só corte e vinco manual ou guilhotina)
                </span>
              </label>
              {origem !== "pdf" && (
                <Field label="Arte do cliente (opcional)" hint="Imagem PNG ou JPG, só para ver a arte nas peças e na caixa 3D. Fica no seu computador.">
                  <input type="file" accept="image/*" onChange={aoEscolherArte} className="text-sm" />
                </Field>
              )}
              {arteUrl && (
                <div className="flex flex-col gap-2">
                  <select className={selectCls} value={modoArte} onChange={(e) => setModoArte(e.target.value as ModoArte)}>
                    <option value="toda">A imagem é a faca aberta inteira</option>
                    <option value="frente">Aplicar só na frente</option>
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={() => setArteUrl(null)}>
                    Remover arte
                  </Button>
                </div>
              )}
              {erroArte && <p className="text-xs text-destructive">{erroArte}</p>}
              {materiais.length > 1 && (
                <Field label="Aplicar no material">
                  <select className={selectCls} value={material} onChange={(e) => setMaterial(Number(e.target.value))}>
                    {materiais.map((m, i) => (
                      <option key={i} value={i}>
                        {`Material ${i + 1} — ${textoMaterial(m)}`}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={abaCls("opcoes")} onClick={() => setAba("opcoes")}>
                  Opções de montagem
                </button>
                <button type="button" className={abaCls("faca")} onClick={() => setAba("faca")}>
                  Faca aberta e 3D
                </button>
                <button type="button" className={abaCls("conjugado")} onClick={() => setAba("conjugado")}>
                  Conjugado
                </button>
              </div>

              {resultado && (
                <p className="text-sm">
                  {resultado.maquinas.length ? (
                    <>
                      Máquina: <strong>{resultado.maquinas.map((m) => m.nome).join(" ou ")}</strong>
                    </>
                  ) : (
                    <strong className="text-destructive">Nenhuma Roland serve para estas cores e esta espessura.</strong>
                  )}
                </p>
              )}

              {aba === "faca" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <h5 className="mb-2 text-sm font-semibold">Faca aberta</h5>
                    {faca ? <FacaAbertaSvg faca={faca} arte={arte} /> : <p className="text-sm text-muted-foreground">Informe a faca (ou leia o PDF da arte).</p>}
                    {faca && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {fmt(faca.W)} × {fmt(faca.H)} mm · área real {fmt(faca.area / 100)} cm² ({fmt((faca.area / (faca.W * faca.H)) * 100, 0)}% do retângulo) · lâmina por peça{" "}
                        {fmt((faca.corte + faca.vinco) / 1000, 2)} m
                        {faca.origem === "generica" ? " · desenho de exemplo" : faca.origem === "pdf" ? " · contorno lido do PDF" : ""}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <h5 className="mb-2 text-sm font-semibold">Prévia 3D (fechado)</h5>
                    {faca?.medidas ? <Cubo3D faca={faca} arte={arte} /> : <p className="text-sm text-muted-foreground">A prévia 3D precisa dos painéis do cartucho (PDF com faca ou modelo genérico).</p>}
                    <p className="mt-2 text-xs text-muted-foreground">Arraste para girar. Tampa e fundo ficam lisos.</p>
                  </div>
                </div>
              )}

              {aba === "conjugado" && (
                <div className="rounded-lg border p-3">
                  <h5 className="mb-1 text-sm font-semibold">Conjugado — vários modelos na mesma faca</h5>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Um só acerto para todos. Só conjuga se cada modelo ficar entre 100% e 110% da quantidade dele. Poses por fator da opção escolhida: <strong>{op?.posesPorFator ?? "—"}</strong>.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {conj.map((m, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input value={m.nome} onChange={(e) => setConj((l) => l.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} />
                        <Input inputMode="numeric" placeholder="Quantidade" value={m.qtd} onChange={(e) => setConj((l) => l.map((x, k) => (k === i ? { ...x, qtd: e.target.value } : x)))} />
                        <Button type="button" variant="ghost" size="sm" disabled={conj.length <= 2} title="Remover modelo" onClick={() => setConj((l) => l.filter((_, k) => k !== i))}>
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-2" disabled={conj.length >= MAX_CONJUGADO} onClick={() => setConj((l) => [...l, { nome: `Modelo ${l.length + 1}`, qtd: "" }])}>
                    + Modelo
                  </Button>
                  <div className="mt-3 text-sm">
                    {!conjugado && <span className="text-muted-foreground">Informe a quantidade de pelo menos dois modelos.</span>}
                    {conjugado && !conjugado.feito && <strong className="text-destructive">Não conjuga: nenhuma divisão das poses fecha. Um acerto por modelo.</strong>}
                    {conjugado?.feito && (
                      <>
                        <p>
                          <strong>Conjuga:</strong> {fmt(conjugado.feito.folhas, 0)} folhas de fator, um só acerto.
                        </p>
                        <table className="mt-2 w-full text-left text-sm">
                          <thead className="text-xs text-muted-foreground">
                            <tr>
                              <th className="py-1">Modelo</th>
                              <th>Poses</th>
                              <th>Produz</th>
                              <th>Sobre o pedido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {conjugado.feito.modelos.map((m) => (
                              <tr key={m.nome} className="border-t">
                                <td className="py-1">{m.nome}</td>
                                <td>{m.poses}</td>
                                <td>{fmt(m.produz, 0)}</td>
                                <td>+{fmt(m.sobre * 100)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {conjugado.feito.posesVazias > 0 && <p className="mt-1 text-xs text-muted-foreground">{conjugado.feito.posesVazias} pose(s) ficam vazias.</p>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {aba === "opcoes" && (
                <>
                  {!resultado && <p className="text-sm text-muted-foreground">Preencha a faca, a quantidade, as cores e a espessura para ver as opções.</p>}
                  {resultado?.avisos.map((a) => (
                    <p key={a} className="text-sm text-destructive">
                      {a}
                    </p>
                  ))}
                  {opcoes.length > 0 && faca && op && (
                    <>
                      <div className="flex flex-col gap-2">
                        {opcoes.map((o, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSel(i);
                              setAviso(null);
                            }}
                            className={`grid grid-cols-[24px_96px_1fr_auto] items-center gap-3 rounded-lg border p-2 text-left ${i === sel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/60"}`}
                          >
                            <span className="text-lg font-bold text-primary">{i + 1}</span>
                            <MontagemSvg op={o} faca={facaDe(o)} barraControle={barra} arte={facaDe(o).partes ? null : arte} />
                            <span className="min-w-0 text-sm">
                              <span className="font-semibold">
                                Folha {fmt(o.formato.w / 10)}×{fmt(o.formato.h / 10)}
                                {o.sobMedida ? " (sob medida)" : ""} · corte {o.corte} · fator {fmt(o.wf / 10)}×{fmt(o.hf / 10)} · fibra no {fmt(o.hf / 10)}
                              </span>
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {o.posesPorFator} poses/fator · {o.pecasPorFolha} peças/folha · {fmt(o.folhas, 0)} folhas · faca {brl(o.custoFaca)}
                                {o.arranjo.estrategia !== "grade" ? ` · ${descEncaixe(o, true)}` : ""}{o.arranjo.tijolo ? " em tijolo" : ""}
                                {o.girada90 ? " · girada 90°" : ""}
                                {o.excesso > CONFIG.toleranciaAcima ? " · passa de +10%" : ""}
                                {o.exigeCorteManual ? " · exige corte e vinco manual" : ""}
                                {o.sobMedida ? ` · entrega em cerca de ${o.prazoDias} dias` : " · em estoque"}
                              </span>
                            </span>
                            <span className="text-right text-base font-bold">{fmt(o.aproveitamento * 100)}%</span>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-lg border p-3">
                        <MontagemSvg op={op} faca={facaDe(op)} barraControle={barra} arte={facaDe(op).partes ? null : arte} detalhe />
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                          {[
                            ["Poses por fator", String(op.posesPorFator)],
                            ["Peças por folha inteira", String(op.pecasPorFolha)],
                            ["Aproveitamento do fator", `${fmt(op.aproveitamento * 100)}%`],
                            ["Perda de papel no interior", `${fmt(op.perdaInterior * 100, 2)}%`],
                            ["Corte a corte (fibra no 2º número)", `${fmt(op.corteACorteW / 10)} × ${fmt(op.corteACorteH / 10)} cm, fibra no ${fmt(op.corteACorteH / 10)}`],
                            ["Folhas de produção", fmt(op.folhas, 0)],
                            ["Peças produzidas", `${fmt(op.pecasProduzidas, 0)} (${op.excesso >= 0 ? "+" : ""}${fmt(op.excesso * 100, 2)}%)`],
                            [
                              "Total de lâminas (estim.)",
                              `${fmt(op.laminaMm / 1000, 2)} m · ${brl(op.custoFaca)}${op.arranjo.seco ? ` (−${fmt(op.arranjo.compartilhado / 1000, 2)} m compartilhados)` : ""}`,
                            ],
                          ].map(([k, v]) => (
                            <div key={k} className="rounded-md border px-2.5 py-1.5">
                              <div className="text-xs text-muted-foreground">{k}</div>
                              <div className="font-semibold">{v}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 rounded-md border border-dashed p-2.5 text-sm">
                          {op.sobMedida ? (
                            <>
                              <strong>Folha sob medida:</strong> {fmt(op.formato.w / 10)} × {fmt(op.formato.h / 10)} cm (fibra no {fmt(op.formato.h / 10)}), fator {fmt(op.wf / 10)} × {fmt(op.hf / 10)} cm (fibra no {fmt(op.hf / 10)}), com{" "}
                              {fmt(op.aproveitamento * 100)}% de aproveitamento (+{fmt(op.ganhoPontos ?? 0)} pontos sobre a melhor folha em estoque). O fornecedor corta da bobina no tamanho pedido, sem limite de
                              tamanho, então a folha já vem no tamanho do fator, sem corte (corte 1), mas leva cerca de {op.prazoDias} dias. Ao aprovar, o Formato Ideal do card também é preenchido.
                            </>
                          ) : (
                            <>
                              <strong>Formato padrão em estoque:</strong> folha {fmt(op.formato.w / 10)} × {fmt(op.formato.h / 10)} cm (fibra no {fmt(op.formato.h / 10)}). É só carregar e entregar.
                            </>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                          Margem lateral de {CONFIG.margemLateralMm} mm; pinça de {op.pincaMm} mm; margem depois da barra de controle ainda não informada (considerada {CONFIG.margemTraseiraMm} mm).
                          {faca.origem === "retangulo" ? " A lâmina de uma faca retangular conta só o contorno de corte." : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Button type="button" onClick={aprovar}>
                            Aprovar esta opção e preencher os campos
                          </Button>
                          <span className="text-xs text-muted-foreground">Preenche o bloco do Material {material + 1} e grava a pré-montagem no card.</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}
      {anexando && <p className="text-xs text-muted-foreground">Anexando a imagem da pré-montagem…</p>}
      {imagem && (
        <a href={imagem.url} download={imagem.nome} className="w-fit text-sm text-primary underline underline-offset-2">
          Baixar a imagem da pré-montagem ({imagem.nome})
        </a>
      )}
    </div>
  );
}
