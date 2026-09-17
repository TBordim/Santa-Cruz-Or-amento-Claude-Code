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

export function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

// Caixa de resumo somente leitura no topo da gaveta (Cliente/Produto/etc.) — substitui o
// .compare-box.numeros-box legado.
export function ResumoBox({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="truncate font-medium text-foreground">{r.value}</span>
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
