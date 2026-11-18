const AVATAR_COLORS = [
  "bg-slate-100 text-slate-600",
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface InitialAvatarProps {
  name: string;
  size?: "sm" | "md";
}

export default function InitialAvatar({ name, size = "md" }: InitialAvatarProps) {
  const color = AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${color} ${
        size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-sm"
      }`}
    >
      {getInitials(name)}
    </span>
  );
}