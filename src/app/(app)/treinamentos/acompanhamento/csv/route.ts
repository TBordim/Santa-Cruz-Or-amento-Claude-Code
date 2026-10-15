import { sessaoAtual } from "@/lib/permissions";
import { matrizAcompanhamento, podeAcompanhar } from "@/lib/treinamentos/dados";
import { rotuloDoModulo } from "@/lib/treinamentos/apresentacao";
import { ROTULO_SITUACAO } from "@/lib/treinamentos/situacao";

function campo(v: string | number): string {
  const s = String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exporta a tabela do acompanhamento (com os mesmos filtros da tela) para planilha ou auditoria. Separador ";" e
// BOM no começo, para o Excel em português abrir com acentos e colunas certas.
export async function GET(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return new Response("Não autorizado", { status: 401 });
  if (!podeAcompanhar(sessao)) return new Response("Sem permissão", { status: 403 });

  const url = new URL(req.url);
  const perfilId = url.searchParams.get("perfil") || undefined;
  const treinamentoId = url.searchParams.get("treinamento") || undefined;
  const soPendentes = url.searchParams.get("pendentes") === "1";
  const { treinamentos, linhas } = await matrizAcompanhamento({ perfilId, treinamentoId, soPendentes });

  const linhasCsv = [["Colaborador", "Perfil", "Módulo", "Treinamento", "Situação", "Melhor nota (%)", "Data"].map(campo).join(";")];
  for (const l of linhas) {
    l.celulas.forEach((c, i) => {
      if (!c.aplica) return;
      const t = treinamentos[i];
      linhasCsv.push(
        [
          l.nome,
          l.perfilNome,
          rotuloDoModulo(t.modulo),
          t.titulo,
          ROTULO_SITUACAO[c.situacao.tipo],
          c.situacao.melhorNota ?? "",
          c.situacao.data ? c.situacao.data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "",
        ]
          .map(campo)
          .join(";"),
      );
    });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + linhasCsv.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="acompanhamento-treinamentos-${hoje}.csv"`,
    },
  });
}
