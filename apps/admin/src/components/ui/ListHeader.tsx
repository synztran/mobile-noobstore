interface ListHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function ListHeader({ title, subtitle, actions }: ListHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-heading">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-body">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}