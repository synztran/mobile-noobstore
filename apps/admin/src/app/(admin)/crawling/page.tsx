import { getAdminClient } from "@/lib/supabase/admin";
import CrawlingClientWrapper from "@/components/crawling/CrawlingClientWrapper";

export const metadata = {
  title: "Crawling - NoobStore Admin",
};

export default async function CrawlingPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab ?? "sources";
  const supabase = getAdminClient();

  const [sourcesResult, detectionsResult] = await Promise.all([
    supabase
      .from("crawling_sources")
      .select("*, vendor:vendors(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("crawling_detections")
      .select("*, source:crawling_sources(name, vendor_id, type)")
      .order("created_at", { ascending: false }),
  ]);

  const sources = sourcesResult.data ?? [];
  const detections = detectionsResult.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">Crawling</p>
      </div>

      {/* <CrawlingClientWrapper sources={sources} detections={detections} initialTab={tab} /> */}
    </div>
  );
}
