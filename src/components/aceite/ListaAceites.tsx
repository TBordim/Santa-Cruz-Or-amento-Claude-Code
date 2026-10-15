import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDateTime } from "@/lib/orcamentos/constantes";
import { rotuloSO, valorSO } from "@/lib/orcamentos/modelos";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import type { AceiteLinha } from "@/lib/aceite/dados";
import { temAlertaPendente, PILL_STYLE } from "@/lib/aceite/constantes";
import { setoresAtuais } from "@/lib/aceite/setor-atual";

// "Está com": o setor (ou os dois setores) que segura o Aceite agora e o que falta, mais o alerta de
// mudança do fornecedor. O mesmo resumo em todas as tabelas de Aceites.
export function SelosAceite({ a }: { a: AceiteLinha }) {
  const alerta = temAlertaPendente(a.pedidosMaterial);
  return (
    <div className="flex flex-col gap-1">
      {setoresAtuais(a).map((s) => (
        <span key={s.setor} className="inline-flex items-baseline gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: s.cor }} />
          <b className="font-semibold" style={{ color: s.cor }}>
            {s.setor}
          </b>
          <span className="text-muted-foreground">{s.acao}</span>
        </span>
      ))}
      {alerta && (
        <Badge className={`w-fit gap-1 rounded-full border-0 font-mono text-[10.5px] font-bold ${PILL_STYLE.bad}`}>
          <TriangleAlert className="h-3 w-3" />
          Fornecedor mudou
        </Badge>
      )}
    </div>
  );
}

export type ColunaExtra = { titulo: string; valor: (a: AceiteLinha) => React.ReactNode };

export function ListaAceites({
  aceites,
  hrefBase,
  vazio,
  extra,
  acao = "Abrir",
}: {
  aceites: AceiteLinha[];
  hrefBase: string;
  vazio: string;
  extra?: ColunaExtra;
  acao?: string;
}) {
  if (!aceites.length) return <div className="empty-state">{vazio}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Cliente e produto</TableHead>
            <TableHead>SO fechada</TableHead>
            <TableHead>Está com</TableHead>
            {extra && <TableHead>{extra.titulo}</TableHead>}
            <TableHead>Atualizado</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {aceites.map((a) => {
            const so = a.soEscolhida as unknown as PrecificacaoTier | null;
            return (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{a.numero ?? "—"}</TableCell>
                <TableCell className="max-w-[280px]">
                  <Link href={`${hrefBase}/${a.id}`} className="block truncate font-medium text-foreground no-underline hover:underline">
                    {a.orcamento.cliente}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">{a.orcamento.produtoDescricao}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {so ? (
                    <>
                      <span className="block font-mono text-xs">{so.numeroSequencial ? `SO ${so.numeroSequencial} · ` : ""}{rotuloSO(so)}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{fmtMoney(valorSO(so))}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <SelosAceite a={a} />
                </TableCell>
                {extra && <TableCell className="whitespace-nowrap">{extra.valor(a)}</TableCell>}
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(a.atualizadoEm)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${hrefBase}/${a.id}`}>{acao}</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
