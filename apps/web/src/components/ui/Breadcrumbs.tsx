import Link from "next/link";
import Icon from "@/components/ui/Icon";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <Icon name="chevron_right" className="text-[14px] opacity-40" />
              )}
              {isLast || !item.href ? (
                <span className="font-medium text-on-surface" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="font-medium transition-colors hover:text-primary">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
