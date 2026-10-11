import { erroNosCores } from "./cores";
import { codigoInternoValido, formatarCodigoInterno } from "./codigo-interno";
import { ehRepeticao } from "./modelos";
import type { Modelo } from "./types";

// Regras dos modelos (vários produtos na mesma faca) que valem pra liberar a Solicitação, a
// Engenharia, o Cadastro de Produto (etapa 7) e a Engenharia do Aceite: modelo de repetição tem
// que ter código; código tem formato 0.000.000; o mesmo código não aparece em dois modelos.
// Saiu de painel/actions.ts em 08/10/2026 pra o módulo Aceite usar a mesma regra.
export function erroNosModelos(modelos: Modelo[]): string | null {
  if (!modelos.length) return "Informe ao menos um modelo (descrição do produto).";
  const erroCores = erroNosCores(modelos);
  if (erroCores) return erroCores;
  const nome = (m: Modelo, i: number) => (modelos.length > 1 ? `modelo ${i + 1} (${m.descricao || "sem descrição"})` : "produto");
  for (const [i, m] of modelos.entries()) {
    if (ehRepeticao(m.classificacao) && !m.codInterno) {
      return `Informe o Código interno (Santa Cruz) do ${nome(m, i)}: repetição exige o código.`;
    }
    if (m.codInterno && !codigoInternoValido(m.codInterno)) {
      return `Código interno do ${nome(m, i)} deve ter o formato 0.000.000 (7 dígitos).`;
    }
  }
  const codigos = modelos.map((m) => m.codInterno).filter(Boolean);
  const repetido = codigos.find((c, i) => codigos.indexOf(c) !== i);
  if (repetido) return `O código ${formatarCodigoInterno(repetido)} aparece em mais de um modelo.`;
  return null;
}
