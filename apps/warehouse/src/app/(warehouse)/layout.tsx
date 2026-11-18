import { redirect } from "next/navigation";
import Link from "next/link";
import { requireWarehouseAdmin } from "@/lib/security/admin";

export default async function WarehouseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) redirect(auth.status === 401 ? "/login" : "/unauthorized");

  return (
    <div className="w-shell">
      <aside className="w-sidebar">
        <div className="w-brand"><span className="w-mark">W</span><div className="w-brand-text"><strong>Warehouse</strong><div className="w-small" style={{ color: "#9db1aa" }}>NoobStore / staging</div></div></div>
        <nav className="w-nav" aria-label="Warehouse navigation">
          <Link href="/">▦ <span className="w-nav-label">Catalog</span></Link>
          <Link href="/import">⇧ <span className="w-nav-label">Import / export</span></Link>
          <Link href="/sync">⟳ <span className="w-nav-label">Sync history</span></Link>
        </nav>
        <div className="w-sidebar-foot">Staging catalog only<br />Live stock is managed in Admin</div>
      </aside>
      <div className="w-main">
        <header className="w-top"><span>PRODUCT OPERATIONS</span><span>{auth.user.email ?? "Admin"}</span></header>
        {children}
      </div>
    </div>
  );
}
