import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { classificacaoLabel } from "@/lib/orcamentos/constantes";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { modelosDoDoc, textoMaterial } from "@/lib/orcamentos/modelos";
import type { ReqCliente } from "@/lib/orcamentos/types";

// PDF da solicitação enviada: o registro que o representante guarda no celular ou no computador.
// Gerado no servidor a partir do pedido gravado (pdf-lib, sem dependências). As fontes padrão do
// PDF só entendem WinAnsi (Latin-1 + alguns símbolos): o texto passa por seguro() antes de ser
// desenhado, senão um caractere fora disso (emoji, "≥"...) derrubava a geração inteira.

export type DadosSolicitacao = {
  criadoEm: Date;
  cliente: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  contatoCompras: string | null;
  representante: string | null;
  comissaoCev: string | null;
  origemPedido: string | null;
  analiseCredito: string | null;
  fsc: string | null;
  usaSelo: boolean;
  condPagamento: string | null;
  modalidade: string | null;
  entregaLocalidade: string | null;
  qtdEntregas: string | null;
  entregaDatas: string | null;
  obs: string | null;
  produtoDescricao: string | null;
  codigoCliente: string | null;
  codInterno: string | null;
  classificacao: string | null;
  modelos: unknown;
  reqCliente: unknown;
  anexos: { nome: string }[];
};

const A4 = { w: 595.28, h: 841.89 };
const MARGEM = 42;
const LARGURA = A4.w - MARGEM * 2;
const COR_TEXTO = rgb(0.1, 0.1, 0.12);
const COR_SUAVE = rgb(0.42, 0.44, 0.48);
const COR_TITULO = rgb(0.15, 0.25, 0.36);
const COR_LINHA = rgb(0.82, 0.84, 0.87);

// WinAnsi: 0x20-0x7E, 0xA0-0xFF e uns símbolos da faixa 0x80-0x9F. O resto vira "?".
const EXTRAS_WINANSI = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function seguro(s: string | null | undefined): string {
  return Array.from((s ?? "").normalize("NFC").replace(/[\r\t]+/g, " "))
    .map((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      if (ch === "\n") return ch;
      return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || EXTRAS_WINANSI.has(ch) ? ch : "?";
    })
    .join("");
}

function dataHora(d: Date): string {
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

class Escritor {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly normal: PDFFont,
    readonly negrito: PDFFont,
  ) {
    this.novaPagina();
  }

  novaPagina() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - MARGEM;
  }

  garantir(altura: number) {
    if (this.y - altura < MARGEM + 18) this.novaPagina();
  }

  // Quebra o texto em linhas que cabem na largura (respeita \n e parte palavras maiores que a linha).
  quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
    const linhas: string[] = [];
    for (const paragrafo of seguro(texto).split("\n")) {
      let atual = "";
      for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
        let p = palavra;
        while (fonte.widthOfTextAtSize(p, tamanho) > largura) {
          let corte = p.length - 1;
          while (corte > 1 && fonte.widthOfTextAtSize(p.slice(0, corte), tamanho) > largura) corte--;
          if (atual) {
            linhas.push(atual);
            atual = "";
          }
          linhas.push(p.slice(0, corte));
          p = p.slice(corte);
        }
        const tentativa = atual ? `${atual} ${p}` : p;
        if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) atual = tentativa;
        else {
          linhas.push(atual);
          atual = p;
        }
      }
      linhas.push(atual);
    }
    return linhas.length ? linhas : [""];
  }

  titulo(texto: string) {
    this.garantir(34);
    this.y -= 14;
    this.page.drawText(seguro(texto), { x: MARGEM, y: this.y, size: 11, font: this.negrito, color: COR_TITULO });
    this.y -= 4;
    this.page.drawLine({ start: { x: MARGEM, y: this.y }, end: { x: MARGEM + LARGURA, y: this.y }, thickness: 0.6, color: COR_LINHA });
    this.y -= 12;
  }

  // Rótulo à esquerda, valor à direita (quebrando linha). Campo vazio não aparece.
  campo(rotulo: string, valor: string | null | undefined) {
    const v = (valor ?? "").trim();
    if (!v) return;
    const larguraRotulo = 128;
    const linhas = this.quebrar(v, this.normal, 9.5, LARGURA - larguraRotulo);
    this.garantir(linhas.length * 12.5 + 3);
    this.page.drawText(seguro(rotulo), { x: MARGEM, y: this.y, size: 8.5, font: this.normal, color: COR_SUAVE });
    for (const l of linhas) {
      this.page.drawText(l, { x: MARGEM + larguraRotulo, y: this.y, size: 9.5, font: this.normal, color: COR_TEXTO });
      this.y -= 12.5;
    }
    this.y -= 3;
  }

  // Tabela simples de colunas com largura fixa; repete o cabeçalho ao mudar de página.
  tabela(colunas: { titulo: string; largura: number }[], linhas: string[][]) {
    const desenharCabecalho = () => {
      this.garantir(24);
      let x = MARGEM;
      for (const c of colunas) {
        this.page.drawText(seguro(c.titulo), { x, y: this.y, size: 8, font: this.negrito, color: COR_SUAVE });
        x += c.largura;
      }
      this.y -= 4;
      this.page.drawLine({ start: { x: MARGEM, y: this.y }, end: { x: MARGEM + LARGURA, y: this.y }, thickness: 0.5, color: COR_LINHA });
      this.y -= 11;
    };
    desenharCabecalho();
    for (const linha of linhas) {
      const quebradas = linha.map((cel, i) => this.quebrar(cel, this.normal, 9, colunas[i].largura - 6));
      const alturaLinha = Math.max(...quebradas.map((q) => q.length)) * 11.5 + 4;
      if (this.y - alturaLinha < MARGEM + 18) {
        this.novaPagina();
        desenharCabecalho();
      }
      let x = MARGEM;
      quebradas.forEach((q, i) => {
        q.forEach((l, j) => this.page.drawText(l, { x, y: this.y - j * 11.5, size: 9, font: this.normal, color: COR_TEXTO }));
        x += colunas[i].largura;
      });
      this.y -= alturaLinha;
    }
  }
}

const junta = (lista: string[] | undefined | null, extra?: string | null) => [...(lista ?? []), ...(extra ? [extra] : [])].join(", ");

export async function gerarPdfSolicitacao(d: DadosSolicitacao): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Solicitação de orçamento");
  doc.setAuthor("Santa Cruz Indústria Gráfica");
  doc.setCreationDate(d.criadoEm);
  const e = new Escritor(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  const c = (d.reqCliente as ReqCliente | null) ?? null;
  const modelos = modelosDoDoc(d);

  // Cabeçalho
  e.page.drawText("SANTA CRUZ INDÚSTRIA GRÁFICA", { x: MARGEM, y: e.y, size: 8.5, font: e.negrito, color: COR_SUAVE });
  e.y -= 24;
  e.page.drawText("Solicitação de orçamento", { x: MARGEM, y: e.y, size: 20, font: e.negrito, color: COR_TEXTO });
  e.y -= 16;
  e.page.drawText(seguro(`Enviada em ${dataHora(d.criadoEm)}${d.representante ? ` por ${d.representante}` : ""}`), {
    x: MARGEM,
    y: e.y,
    size: 9.5,
    font: e.normal,
    color: COR_SUAVE,
  });
  e.y -= 6;

  e.titulo("Cliente");
  e.campo("Cliente", d.cliente);
  e.campo("CNPJ", d.cnpj);
  e.campo("Endereço", d.endereco);
  e.campo("Telefone", d.telefone);
  e.campo("E-mail", d.email);
  e.campo("Contato compras", d.contatoCompras);
  e.campo("Representante", d.representante);
  e.campo("Comissão CEV", d.comissaoCev);

  e.titulo("Condições comerciais e entrega");
  e.campo("Condição de pagamento", d.condPagamento);
  e.campo("Modalidade", d.modalidade);
  e.campo("Localidade de entrega", d.entregaLocalidade);
  e.campo("Qtd. de entregas", d.qtdEntregas);
  e.campo("Data de entrega solicitada", d.entregaDatas);

  e.titulo(modelos.length > 1 ? `Produtos (${modelos.length} modelos)` : "Produto");
  e.tabela(
    [
      { titulo: "Nº", largura: 24 },
      { titulo: "DESCRIÇÃO", largura: 200 },
      { titulo: "CLASSIFICAÇÃO", largura: 108 },
      { titulo: "CÓD. INTERNO", largura: 66 },
      { titulo: "CÓD. CLIENTE", largura: 69 },
      { titulo: "CORES", largura: 44 },
    ],
    modelos.map((m, i) => [
      String(i + 1),
      m.descricao || "—",
      classificacaoLabel(m.classificacao),
      m.codInterno ? formatarCodigoInterno(m.codInterno) : "—",
      m.codigoCliente || "—",
      m.cores || "—",
    ]),
  );
  e.y -= 4;
  e.campo("Quantidades a orçar", c?.quantidadesLista?.join(", "));
  e.campo("Observações", d.obs);
  e.campo("Link da arte", c?.linkArte);
  e.campo("Arquivos anexados", d.anexos.map((a) => a.nome).join(", "));

  e.titulo("Classificação do pedido");
  e.campo("Origem do pedido", d.origemPedido);
  e.campo("Análise de crédito", d.analiseCredito);
  e.campo("FSC", d.fsc);
  e.campo("Usa selo", d.usaSelo ? "Sim" : null);

  const medidas = [c?.medidaF, c?.medidaL, c?.medidaA].some(Boolean)
    ? `${c?.medidaF || "—"} × ${c?.medidaL || "—"} × ${c?.medidaA || "—"} mm (comprimento × largura × altura)`
    : null;
  const algumTecnico = !!(
    medidas || c?.suportes?.length || c?.acabamentos?.length || c?.verniz?.length || c?.plastico?.length || c?.embalagem?.length || c?.impressao?.length || c?.fechamentoTampa || c?.fechamentoFundo
  );
  if (algumTecnico) {
    e.titulo("Detalhes técnicos");
    e.campo("Medidas", medidas);
    (c?.suportes ?? []).forEach((s, i) => e.campo(`Material ${i + 1}`, `${textoMaterial(s)}${s.uso === "conjunto" ? " (uso conjunto)" : ""}`));
    e.campo("Acabamento", junta(c?.acabamentos, c?.acabamentoOutro));
    e.campo("Verniz", junta(c?.verniz));
    e.campo("Plástico", junta(c?.plastico));
    e.campo("Embalagem", junta(c?.embalagem, c?.embalagemDetalhe));
    e.campo("Impressão", junta(c?.impressao));
    e.campo("Fechamento tampa", c?.fechamentoTampa);
    e.campo("Fechamento fundo", c?.fechamentoFundo);
  }

  // Rodapé de todas as páginas, com "Página n de N" (só dá pra saber o total no fim).
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawText("Registro da solicitação enviada à Santa Cruz — App Sta Cruz", { x: MARGEM, y: 24, size: 7.5, font: e.normal, color: COR_SUAVE });
    const t = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(t, { x: A4.w - MARGEM - e.normal.widthOfTextAtSize(t, 7.5), y: 24, size: 7.5, font: e.normal, color: COR_SUAVE });
  });

  return doc.save();
}
