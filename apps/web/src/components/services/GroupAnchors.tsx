/**
 * Zero-height anchors for every service group, carrying the ids the showcase
 * cards link to (`#switch`, `#cleaning`, …).
 *
 * The real anchors live on the booking flow's group cards
 * (`ServiceSectionCard` renders `id={section.key}`). Those cards only exist
 * once the flow has both a session *and* its config payload, so every state
 * where they are missing renders these markers instead — never both, which
 * would duplicate ids and send every link to the first one.
 *
 * Without them a click targets a fragment that does not exist, and the browser
 * falls back to the top of the page — which reads as a broken scroll.
 */
export function GroupAnchors({ sectionKeys }: { sectionKeys: string[] }) {
  return (
    <>
      {sectionKeys.map((key) => (
        <span
          key={key}
          id={key}
          aria-hidden="true"
          className="block h-0 scroll-mt-24"
        />
      ))}
    </>
  );
}
