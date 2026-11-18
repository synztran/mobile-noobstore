import Link from "next/link";

export default function UnauthorizedPage() {
  return <main className="w-auth"><section className="w-auth-card"><div className="w-kicker">Access restricted</div><h1 className="w-title">Admin access required</h1><p className="w-sub">This warehouse workspace is limited to users with the NoobStore admin role.</p><Link className="w-btn" href="/login" style={{ marginTop: 22 }}>Return to sign in</Link></section></main>;
}
