import { ExternalLink, MapPin } from "lucide-react";
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

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface">
        {title}
      </p>
      <ul className="flex flex-col gap-2 text-xs font-semibold normal-case tracking-normal text-on-surface-variant">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeFooter() {
  const statusPageUrl = process.env.NEXT_PUBLIC_STATUS_PAGE_URL;

  return (
    <footer className="!mt-0 bg-surface-container p-5">
      {/* Store Location & Google Map embed section */}
      <div className="mb-[14px] hidden border-b border-on-surface/10 pb-[14px] lg:block">
        <section className="grid grid-cols-1 gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-ambient-sm lg:grid-cols-12 lg:items-center lg:gap-8 lg:p-6">
          <div className="flex flex-col gap-3 lg:col-span-5">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              <MapPin className="h-4 w-4" />
              Ghé thăm cửa hàng
            </p>
            <h3 className="text-xl font-black tracking-tight text-on-surface lg:text-2xl">
              NoobStore
            </h3>
            <p className="text-xs font-semibold leading-relaxed text-on-surface-variant">
              Trải nghiệm trực tiếp các mẫu bàn phím cơ custom cao cấp, switch tuyển chọn và phụ kiện tại không gian NoobStore.
            </p>
            <a
              href="https://maps.app.goo.gl/RujaNa6xfJ1yRqEj8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-black text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-95"
            >
              <MapPin className="h-4 w-4" />
              <span>Xem trên Google Maps</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low lg:col-span-7 lg:h-72">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.711894928146!2d106.72272430000001!3d10.833345900000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752906cfa2e82d%3A0x7ce4c6ee6260e38!2sNoobstore!5e0!3m2!1sen!2s!4v1794848743714!5m2!1sen!2s"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Vị trí NoobStore trên Google Maps"
              className="h-full w-full"
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
        {/* Brand */}
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-2">
          <Link
            href="/"
            className="text-lg font-black uppercase tracking-tight text-primary"
          >
            NoobStore
          </Link>
          <p className="max-w-[280px] text-xs font-semibold leading-relaxed text-on-surface-variant">
            Đồ chơi bàn phím cơ tuyển chọn: bàn phím custom, switch, keycap và
            phụ kiện. Build cùng cộng đồng NoobStore, giao hàng toàn quốc, bảo
            hành minh bạch.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="https://facebook.com/noobstore"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              data-tip="Facebook"
              className="tooltip tooltip-top flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
            <a
              href="https://instagram.com/noobstore"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              data-tip="Instagram"
              className="tooltip tooltip-top flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <FooterColumn
          title="Mua sắm"
          links={[
            { href: "/shop", label: "Cửa hàng" },
            { href: "/gacha", label: "Gacha" },
            { href: "/rewards", label: "Đổi thưởng" },
            { href: "/community", label: "Cộng đồng" },
          ]}
        />
        <FooterColumn
          title="Hỗ trợ"
          links={[
            { href: "/profile/support", label: "Liên hệ hỗ trợ" },
            { href: "/policy", label: "Chính sách" },
            { href: "/delivery-terms", label: "Vận chuyển" },
            { href: "/terms", label: "Điều khoản" },
          ]}
        />
        <FooterColumn
          title="Về NoobStore"
          links={[
            { href: "/about", label: "Về chúng tôi" },
            { href: "/blogs", label: "Blog" },
            { href: "/profile/points", label: "Điểm thưởng" },
          ]}
        />
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-on-surface/10 pt-5 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
        <p>© 2026 NoobStore</p>
      </div>
    </footer>
  );
}
