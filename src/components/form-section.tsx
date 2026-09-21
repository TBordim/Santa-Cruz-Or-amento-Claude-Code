// Agrupa um bloco de campos com título — usado nos formulários longos (Novo Orçamento, gaveta
// por etapa) para reproduzir a divisão em seções do .form-section legado, agora em Tailwind.
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-6 first:mt-0 first:border-t-0 first:pt-0 [&:not(:first-child)]:mt-6">
      <h4 className="mb-4 text-sm font-semibold text-foreground">{title}</h4>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

// `compacto`: pares de campos curtos (medidas, quantidades, %) continuam lado a lado no celular
// em vez de empilhar — corta bastante a rolagem dos formulários longos. Deixe desligado quando
// o campo tem texto longo (endereço, e-mail, descrição), que não cabe em meia largura.
export function Row2({ children, compacto = false }: { children: React.ReactNode; compacto?: boolean }) {
  return (
    <div className={compacto ? "grid grid-cols-2 items-end gap-3 sm:gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
      {children}
    </div>
  );
}

// Barra de ações do formulário (Salvar / Liberar). No celular fica presa no rodapé da gaveta
// enquanto se rola o formulário — o botão nunca some lá embaixo — e os botões dividem a
// largura. Do sm pra cima é só uma linha de botões, como sempre foi.
export function AcoesBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        "acoes-fixas mt-2 flex gap-2",
        "max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:grid max-sm:grid-cols-2 max-sm:border-t max-sm:border-border max-sm:bg-popover/95 max-sm:px-4 max-sm:py-3 max-sm:backdrop-blur",
        "max-sm:[&>button]:h-auto max-sm:[&>button]:min-h-10 max-sm:[&>button]:whitespace-normal max-sm:[&>button]:px-2 max-sm:[&>button]:py-1.5 max-sm:[&>button]:leading-tight",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

// Caixa de resumo somente leitura no topo da gaveta (Cliente/Produto/etc.) — substitui o
// .compare-box.numeros-box legado.
export function ResumoBox({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 text-sm md:items-center">
          <span className="shrink-0 text-muted-foreground">{r.label}</span>
          <span className="min-w-0 break-words text-right font-medium text-foreground md:truncate">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// "Diretriz da etapa" — instrução curta no topo de cada formulário de etapa.
export function DiretrizBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <div className="mb-1 font-semibold text-foreground">Diretriz da etapa</div>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
