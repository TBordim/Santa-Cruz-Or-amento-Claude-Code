export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 md:mb-6 md:gap-4">
      <div>
        <h2 className="font-serif text-2xl font-semibold md:text-[31px] tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1.5 max-w-[62ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
