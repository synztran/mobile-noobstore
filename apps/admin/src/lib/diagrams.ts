export interface AdminDiagram {
  slug: string;
  title: string;
  description: string;
  file: string;
  sourceRevision: string;
  lastReviewed: string;
}

export const ADMIN_DIAGRAMS: AdminDiagram[] = [
  {
    slug: "cart-module",
    title: "Cart module — committed architecture",
    description:
      "Cart client state, React Query, API routes, stock validation, and persistence.",
    file: "cart-module.html",
    sourceRevision: "9c6c174",
    lastReviewed: "2026-11-22",
  },
  {
    slug: "checkout-submission",
    title: "Checkout — order submission flow",
    description:
      "Server-side validation, transactional order/stock creation, and post-order follow-ups.",
    file: "checkout-submission.html",
    sourceRevision: "9c6c174",
    lastReviewed: "2026-11-22",
  },
  {
    slug: "notification-system",
    title: "Notification — end-to-end architecture",
    description:
      "Admin targeting, web push subscriptions and inbox, plus server-triggered delivery.",
    file: "notification-system.html",
    sourceRevision: "c2a4a6f",
    lastReviewed: "2026-11-22",
  },
];

export function getAdminDiagram(slug: string): AdminDiagram | undefined {
  return ADMIN_DIAGRAMS.find((diagram) => diagram.slug === slug);
}
