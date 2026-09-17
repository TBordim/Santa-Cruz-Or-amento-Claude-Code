export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <h2 className="font-serif text-[31px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1.5 max-w-[62ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
