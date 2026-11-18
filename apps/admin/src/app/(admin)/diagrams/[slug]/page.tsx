import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminDiagram } from "@/lib/diagrams";

export const dynamic = "force-dynamic";

export default async function DiagramViewerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const diagram = getAdminDiagram(slug);
  if (!diagram) notFound();

  return (
    <main className="flex h-[calc(100dvh-2rem)] min-h-[32rem] flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/diagrams" className="link link-hover text-sm text-primary">
            ← All diagrams
          </Link>
          <h1 className="mt-1 text-xl font-bold">{diagram.title}</h1>
          <p className="text-xs text-base-content/60">
            Based on source revision {diagram.sourceRevision}
          </p>
        </div>
      </header>

      <iframe
        title={diagram.title}
        src={`/api/diagrams/${diagram.slug}`}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="min-h-0 w-full flex-1 rounded-box border border-base-300 bg-base-100"
      />
    </main>
  );
}
