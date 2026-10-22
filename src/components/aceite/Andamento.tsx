import { Check, Clock } from "lucide-react";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { chegadaDoPapel, fmtDia } from "@/lib/aceite/constantes";
import { papelGarantido } from "@/lib/aceite/suportes";

type Passo = { titulo: string; ok: boolean; atual: boolean; detalhe: string };

type AceiteAndamento = {
  etapa: string;
  vendasLiberadoEm: Date | null;
  vendasLiberadoPor: string | null;
  engenhariaEm: Date | null;
  engenhariaPor: string | null;
  situacaoPapel: string;
  suportes?: unknown;
  pedidosMaterial: { status: string; prazoPrevisto: Date | string | null; suporteRef?: string | null }[];
  pcpEm: Date | null;
  dataEntrega: Date | null;
  pedidoCadastradoEm: Date | null;
  clienteInformadoEm: Date | null;
  numeroPedido: string | null;
  numeroOF: string | null;
  entregueEm: Date | null;
};

// Linha do tempo do Aceite, vista igual por todos os setores: quem já fez a sua parte e onde o
// pedido está parado agora. Engenharia e Papel andam ao mesmo tempo; os dois ficam em destaque.
// `papelOkLotes`: Aceite dividido antes de ir aos lotes, o papel só está garantido quando o de TODOS os lotes está.
export function Andamento({ a, papelOkLotes }: { a: AceiteAndamento; papelOkLotes?: boolean }) {
  const papelOk = papelOkLotes ?? papelGarantido(a);
  const chegada = chegadaDoPapel(a.pedidosMaterial);
  const emParalelo = a.etapa === "ENGENHARIA_MATERIAL"; // Engenharia e Papel andam juntos nesta etapa
  const passos: Passo[] = [
    {
      titulo: "Vendas",
      ok: !!a.vendasLiberadoEm,
      atual: a.etapa === "VENDAS",
      detalhe: a.vendasLiberadoEm ? `${a.vendasLiberadoPor} · ${fmtDateTime(a.vendasLiberadoEm)}` : "Preencher o Aceite",
    },
    {
      titulo: "Engenharia",
      ok: !!a.engenhariaEm,
      atual: emParalelo && !a.engenhariaEm,
      detalhe: a.engenhariaEm ? `${a.engenhariaPor} · ${fmtDateTime(a.engenhariaEm)}` : "Conferir o cadastro",
    },
    {
      titulo: "Papel",
      ok: papelOk && !!a.vendasLiberadoEm,
      atual: emParalelo && !papelOk,
      detalhe: papelOk ? (chegada ? `Chega em ${fmtDia(chegada)}` : "Reservado em estoque") : "Aguardando data de chegada",
    },
    {
      titulo: "PCP",
      ok: !!a.pcpEm,
      atual: a.etapa === "PCP",
      detalhe: a.dataEntrega ? `Entrega em ${fmtDia(a.dataEntrega)}` : "Definir a data de entrega",
    },
    {
      titulo: "Pedido",
      ok: !!a.pedidoCadastradoEm,
      atual: a.etapa === "PEDIDO",
      detalhe: a.pedidoCadastradoEm ? `Pedido ${a.numeroPedido ?? ""} no ERP${a.numeroOF ? ` · OF ${a.numeroOF}` : " · falta a OF"}` : "Vendas cadastra no ERP",
    },
    {
      titulo: "Atendimento",
      ok: !!a.clienteInformadoEm,
      atual: a.etapa === "ATENDIMENTO",
      detalhe: a.clienteInformadoEm ? "Data enviada ao cliente" : "Enviar a data ao cliente",
    },
    {
      titulo: "Entrega",
      ok: !!a.entregueEm,
      atual: a.etapa === "ENTREGA",
      detalhe: a.entregueEm ? `Entregue em ${fmtDia(a.entregueEm)}` : a.dataEntrega ? `PCP confirma (prevista ${fmtDia(a.dataEntrega)})` : "PCP confirma a entrega",
    },
  ];

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Andamento do Aceite">
      {passos.map((p) => (
        <li key={p.titulo}>
          <Etapa p={p} />
        </li>
      ))}
    </ol>
  );
}

function Etapa({ p }: { p: Passo }) {
  const cor = p.ok ? "border-good/40 bg-good-soft text-good" : p.atual ? "border-warn/40 bg-warn-soft text-warn" : "border-border bg-card text-muted-foreground";
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${cor}`}>
      {p.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0">
        <div className="font-semibold">{p.titulo}</div>
        <div className="text-xs opacity-90">{p.detalhe}</div>
      </div>
    </div>
  );
}
