"use client";

import { ExternalLink, Star } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function GoogleReviewBanner() {
  const googleReviewUrl =
    process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
    "https://maps.app.goo.gl/RujaNa6xfJ1yRqEj8";

  return (
    <div className="shadow-2xs flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container/30 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="shadow-2xs grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface ring-1 ring-outline-variant/15">
          <GoogleIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-bold text-on-surface">
              Đánh giá NoobStore trên Google
            </span>
            <div className="xs:flex hidden items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={11} className="fill-amber-400" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <a
        href={googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shadow-2xs btn btn-ghost btn-xs h-7 shrink-0 gap-1 rounded-xl border border-outline-variant/30 bg-surface px-2.5 text-[11px] font-bold text-on-surface hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95"
      >
        <span>Đánh giá 5★</span>
        <ExternalLink size={11} />
      </a>
    </div>
  );
}
