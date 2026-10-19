// Protocolos de arte: o que serve tanto ao servidor quanto às telas (sem acesso ao banco).
import { chave } from "@/lib/orcamentos/chave";

export const ORIGENS_ARTE = [
  { key: "ORCAMENTO", label: "Pedido de orçamento" },
  { key: "ATENDIMENTO", label: "Atendimento ao Cliente" },
  { key: "ORDEM_DE_COMPRA", label: "Ordem de compra" },
] as const;

export function origemLabel(key: string): string {
  return ORIGENS_ARTE.find((o) => o.key === key)?.label ?? key;
}

// Rev 00, Rev 01...
export function rotuloRevisao(n: number): string {
  return `Rev ${String(n).padStart(2, "0")}`;
}

export function rotuloProtocolo(numero: string, revisao: number): string {
  return `${numero} · ${rotuloRevisao(revisao)}`;
}

// Palavras que sobram de um nome de arquivo ou de uma descrição, pra comparar ("caixa-uva_v2.pdf"
// e "Caixa de gelatina - Uva" compartilham "uva"). Sem acento, em maiúsculo, sem palavras curtas
// ou genéricas.
const GENERICAS = new Set(["PDF", "JPG", "JPEG", "PNG", "ARTE", "FINAL", "CAIXA", "DE", "DA", "DO", "COM", "PARA", "V1", "V2", "V3"]);
export function palavrasDe(texto: string | null | undefined): string[] {
  return chave((texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, ""))
    .replace(/\.[A-Z0-9]{2,4}$/, "")
    .split(/[^A-Z0-9]+/)
    .filter((p) => p.length >= 3 && !GENERICAS.has(p));
}

export type CandidatoProtocolo = {
  id: string;
  numero: string;
  clienteNome: string;
  descricao: string;
  codInterno: string | null;
  ultimaRevisao: number;
};

export type Sugestao = CandidatoProtocolo & { pontos: number; motivos: string[] };

// Ordena os protocolos do cliente pelo quanto parecem a arte que chegou: mesmo código interno do
// modelo pesa mais, depois palavras em comum entre o nome da arte/modelo e a descrição do
// protocolo. Só SUGERE: quem confirma é Vendas (propriedade intelectual do cliente).
export function sugerirProtocolos(
  candidatos: CandidatoProtocolo[],
  arte: { rotulo: string; modeloDescricao?: string | null; codInterno?: string | null },
): Sugestao[] {
  const minhas = new Set([...palavrasDe(arte.rotulo), ...palavrasDe(arte.modeloDescricao)]);
  const cod = (arte.codInterno ?? "").replace(/\D/g, "");
  return candidatos
    .map((c): Sugestao => {
      const motivos: string[] = [];
      let pontos = 0;
      if (cod && c.codInterno && c.codInterno.replace(/\D/g, "") === cod) {
        pontos += 10;
        motivos.push("mesmo código interno");
      }
      const comuns = palavrasDe(`${c.descricao} ${c.numero}`).filter((p) => minhas.has(p));
      if (comuns.length) {
        pontos += comuns.length * 2;
        motivos.push(`nome parecido (${[...new Set(comuns)].join(", ").toLowerCase()})`);
      }
      return { ...c, pontos, motivos };
    })
    .sort((a, b) => b.pontos - a.pontos || a.numero.localeCompare(b.numero));
}

// Salvar o card refaz a lista de modelos a partir do formulário, que não leva o protocolo. Esta
// função devolve o vínculo (protocolo e revisão) aos modelos que já tinham, pelo id. Sem isso, salvar
// o orçamento apagaria o protocolo que Vendas acabou de ligar.
type ComProtocolo = { id: string; protocoloId?: string; protocoloNumero?: string; protocoloRevisao?: number };
export function mesclarProtocolos<T extends ComProtocolo>(novos: T[], antigos: ComProtocolo[]): T[] {
  return novos.map((m) => {
    const antigo = antigos.find((a) => a.id && a.id === m.id);
    if (!antigo?.protocoloId) return m;
    return { ...m, protocoloId: antigo.protocoloId, protocoloNumero: antigo.protocoloNumero, protocoloRevisao: antigo.protocoloRevisao };
  });
}
