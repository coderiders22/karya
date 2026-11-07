export function PageHeader({ title, description, actions, crumbs }: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; crumbs?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 pb-4 pt-5 sm:px-6 dark:border-slate-800">
      <div className="min-w-0 flex-1">
        {crumbs && <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">{crumbs}</div>}
        <h1 className="page-title truncate">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
