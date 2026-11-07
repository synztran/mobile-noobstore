import { MAIL_DOMAIN } from "@/constants";
import { Mail } from "lucide-react";
import Link from "next/link";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export function HomeFooter() {
  const statusPageUrl = process.env.NEXT_PUBLIC_STATUS_PAGE_URL;

  return (
    <footer className="!mt-0 bg-surface-container p-4 lg:p-6">
      <div className="flex flex-col items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        <div className="flex w-full justify-between gap-2 text-xs lg:w-auto lg:gap-4">
          {/* <Link href="/news">Tin tức</Link> */}
          <Link href="/policy">Chính sách</Link>
          <Link href="/terms">Điều khoản</Link>
          <Link href="/delivery-terms">Vận chuyển</Link>
          {statusPageUrl ? (
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              Trạng thái dịch vụ
            </a>
          ) : null}
        </div>

        <div className="flex w-full items-center justify-center gap-2">
          <a
            href="https://facebook.com/noobstore"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary lg:h-8 lg:w-8"
          >
            <FacebookIcon className="h-5 w-5" />
          </a>
          <a
            href="https://instagram.com/noobstore"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary lg:h-8 lg:w-8"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a
            href={`mailto:${MAIL_DOMAIN}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary lg:h-8 lg:w-8"
          >
            <Mail size={20} />
          </a>
        </div>

        <p className="opacity-50 lg:text-right">© 2026 NoobStore</p>
      </div>
    </footer>
  );
}
