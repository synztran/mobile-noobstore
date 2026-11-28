const accessedOn = "2026-11-25";

type Resource = {
  model: string;
  kind: string;
  url: string;
  source: string;
  note: string;
};

const verifiedResources: Resource[] = [
  {
    model: "NEO 60 / 65 / 75 / 80 standard & CU",
    kind: "Firmware, VIA JSON, build guides",
    url: "https://www.qwertykeys.com/pages/fw",
    source: "Qwertykeys — manufacturer resources",
    note: "Select exact model, PCB (wired/tri-mode), layout and revision before downloading or flashing. Not a plate-file source.",
  },
  {
    model: "Singa-distributed keyboards (listed models)",
    kind: "Firmware, plate files and miscellaneous resources (model-dependent)",
    url: "https://singakbd.com/pages/downloads",
    source: "Singa Keyboards — distributor download page",
    note: "Page lists resources for specific models only; confirm exact model/revision. A listed firmware link is not evidence of compatibility with other Singa-distributed boards.",
  },
  {
    model: "Singa (QMK-supported PCB only)",
    kind: "Community firmware source and build instructions",
    url: "https://github.com/qmk/qmk_firmware/tree/master/keyboards/singa",
    source: "QMK Firmware — community-maintained; not manufacturer firmware",
    note: "The QMK entry identifies supported hardware as TGR-Elaine v1.0 PCB. Do not treat as universal Singa firmware or as a plate-file source.",
  },
];

const unverifiedResources = [
  {
    model: "Foxlab",
    kind: "Firmware and plate files",
    note: "No attributable official manufacturer/distributor download repository verified for this request. Search results for individual models or QMK references do not verify official plate files or firmware compatibility.",
  },
  {
    model: "Daji",
    kind: "Firmware, plate files and user guides",
    note: "Daji's storefront confirms keyboard/plate product listings, but no verifiable download page for firmware, plate CAD files or user guides was established. Product listings are not download resources.",
  },
  {
    model: "Mersiri",
    kind: "Firmware, plate files and user guides",
    note: "No credible manufacturer/distributor source could be verified. Confirm spelling, brand identity and exact model with the owner before listing resources.",
  },
];

export function KeyboardResources() {
  return (
    <section aria-labelledby="keyboard-resources-title" className="mb-8 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-6">
      <h2 id="keyboard-resources-title" className="text-lg font-black text-on-surface">
        Tài nguyên chính hãng & cộng đồng đã xác minh
      </h2>
      <p className="mt-1 text-xs text-on-surface-variant">
        Kiểm tra nguồn ngày {accessedOn}. Chỉ mở nguồn; không lưu trữ hay phân phối lại tệp có bản quyền.
      </p>
      <ul className="mt-4 grid gap-3">
        {verifiedResources.map((resource) => (
          <li key={resource.model} className="rounded-xl bg-surface-container p-4">
            <h3 className="font-bold text-on-surface">{resource.model}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{resource.kind}</p>
            <a className="mt-2 inline-block text-sm font-bold text-primary underline" href={resource.url} target="_blank" rel="noreferrer">
              {resource.source} <span className="sr-only">(mở tab mới)</span>
            </a>
            <p className="mt-2 text-xs text-on-surface-variant">{resource.note}</p>
          </li>
        ))}
      </ul>
      <h3 className="mt-6 font-black text-on-surface">Chưa xác minh — không cung cấp liên kết tải</h3>
      <ul className="mt-3 grid gap-3">
        {unverifiedResources.map((resource) => (
          <li key={resource.model} className="rounded-xl border border-outline-variant/30 p-4">
            <h4 className="font-bold text-on-surface">{resource.model} · {resource.kind}</h4>
            <p className="mt-1 text-xs text-on-surface-variant">{resource.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
