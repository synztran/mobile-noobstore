import Link from "next/link";
import { ADMIN_DIAGRAMS } from "@/lib/diagrams";

export const metadata = { title: "Diagrams - NoobStore Admin" };

export default function DiagramsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text))]">
          Architecture diagrams
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Internal, source-backed maps of NoobStore flows.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_DIAGRAMS.map((diagram) => (
          <Link
            key={diagram.slug}
            href={`/diagrams/${diagram.slug}`}
            className="card border border-base-300 bg-base-100 transition-colors hover:border-primary"
          >
            <div className="card-body">
              <h2 className="card-title">{diagram.title}</h2>
              <p className="text-sm text-base-content/70">
                {diagram.description}
              </p>
              <div className="card-actions mt-2 justify-between text-xs text-base-content/60">
                <span>Source revision {diagram.sourceRevision}</span>
                <span>Open diagram →</span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
