// Datas que o cliente pediu para o pedido (11/10/2026): pode haver mais de uma (entregas parceladas),
// cada uma com a quantidade que o cliente quer até lá. Sem acesso ao banco.

export type DataCliente = { data: string; quantidade: number | null; obs: string };

// Lê o campo Json do Aceite. Aceites de antes (só dataCliente) viram uma data só.
export function lerDatasCliente(a: { datasCliente?: unknown; dataCliente?: Date | string | null }): DataCliente[] {
  if (Array.isArray(a.datasCliente) && a.datasCliente.length) {
    return (a.datasCliente as Partial<DataCliente>[])
      .filter((d) => typeof d?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.data))
      .map((d) => ({ data: d.data!, quantidade: typeof d.quantidade === "number" ? d.quantidade : null, obs: String(d.obs ?? "") }));
  }
  if (a.dataCliente) return [{ data: new Date(a.dataCliente).toISOString().slice(0, 10), quantidade: null, obs: "" }];
  return [];
}

// Texto curto para listas: "06/11 (5.000), 20/11".
export function textoDatasCliente(datas: DataCliente[]): string {
  return datas
    .map((d) => {
      const [, m, dia] = d.data.split("-");
      return `${dia}/${m}${d.quantidade ? ` (${d.quantidade.toLocaleString("pt-BR")})` : ""}`;
    })
    .join(", ");
}
