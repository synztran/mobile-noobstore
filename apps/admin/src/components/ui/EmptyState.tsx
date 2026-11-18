interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  message?: string;
  actions?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, message, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--admin-hover))]">
          <Icon className="h-5 w-5 text-[rgb(var(--admin-text-muted))]" />
        </span>
      )}
      <p className="text-sm font-medium text-heading">{title}</p>
      {message && (
        <p className="mt-1 max-w-sm text-[13px] text-body">{message}</p>
      )}
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );
}