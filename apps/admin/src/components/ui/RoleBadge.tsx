const ROLE_STYLES: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
  staff: "bg-blue-50 text-blue-700 ring-blue-200",
  user: "bg-slate-50 text-slate-600 ring-slate-200",
  customer: "bg-slate-50 text-slate-600 ring-slate-200",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  user: "Customer",
  customer: "Customer",
};

export default function RoleBadge({ role }: { role: string | null }) {
  const normalized = (role ?? "user").toLowerCase();
  const style = ROLE_STYLES[normalized] ?? ROLE_STYLES.user;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${style}`}
    >
      {ROLE_LABELS[normalized] ?? normalized}
    </span>
  );
}