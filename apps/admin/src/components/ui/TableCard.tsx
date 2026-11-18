interface TableCardProps {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}

export default function TableCard({ children, toolbar }: TableCardProps) {
  return (
    <div className="card-panel overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--admin-border))] px-4 py-3">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}