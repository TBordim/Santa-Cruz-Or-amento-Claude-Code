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

// Não há "revisão" de protocolo: arte alterada é reprotocolada com o mesmo número e a data muda
// (regra da Karen, 19/10/2026). A data é o que garante a rastreabilidade.
export function fmtDataProtocolo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Data digitada (AAAA-MM-DD) ou, sem ela, agora. Ao meio-dia pra não virar o dia por fuso.
export function lerDataProtocolo(bruta: string | null | undefined): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((bruta ?? "").trim());
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 15)) : new Date();
}

export function rotuloProtocolo(numero: string, data: Date | string | null | undefined): string {
  return `${numero} · ${fmtDataProtocolo(data)}`;
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
  // Data do protocolo em uso, em ISO (serializa para a tela).
  ultimaData: string;
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
type ComProtocolo = { id: string; protocoloId?: string; protocoloNumero?: string; protocoloRevisao?: number; protocoloData?: string };
export function mesclarProtocolos<T extends ComProtocolo>(novos: T[], antigos: ComProtocolo[]): T[] {
  return novos.map((m) => {
    const antigo = antigos.find((a) => a.id && a.id === m.id);
    if (!antigo?.protocoloId) return m;
    return { ...m, protocoloId: antigo.protocoloId, protocoloNumero: antigo.protocoloNumero, protocoloRevisao: antigo.protocoloRevisao, protocoloData: antigo.protocoloData };
  });
}
