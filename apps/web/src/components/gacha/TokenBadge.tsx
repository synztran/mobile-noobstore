import { TOKEN_ICON } from "@/lib/images";
import Image from "next/image";

interface TokenBadgeProps {
  tokenCount: number | null;
}

export function TokenBadge({ tokenCount }: TokenBadgeProps) {
  return (
    <div className="absolute left-0 top-1/2 flex -translate-y-1/2 transform flex-col items-center gap-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-br-xl rounded-tr-xl border border-base-200 shadow-sm">
        <Image
          src={TOKEN_ICON}
          alt="token"
          width={24}
          height={24}
          className="object-contain"
        />
      </div>
      <div className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-base-200 bg-gray-100 p-1 text-center">
        {tokenCount === null ? (
          <span className="loading loading-spinner loading-xs text-warning"></span>
        ) : (
          <span className="text-[8px] font-black text-amber-600">
            x{tokenCount}
          </span>
        )}
      </div>
    </div>
  );
}
