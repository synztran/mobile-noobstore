export interface AdminDiagram {
  slug: string;
  title: string;
  description: string;
  file: string;
  sourceRevision: string;
}

export const ADMIN_DIAGRAMS: AdminDiagram[] = [
  {
    slug: "cart-module",
    title: "Cart module — committed architecture",
    description:
      "Cart client state, React Query, API routes, stock validation, and persistence.",
    file: "cart-module.html",
    sourceRevision: "9c6c174",
  },
  {
    slug: "checkout-submission",
    title: "Checkout — order submission flow",
    description:
      "Server-side validation, transactional order/stock creation, and post-order follow-ups.",
    file: "checkout-submission.html",
    sourceRevision: "9c6c174",
  },
];

export function getAdminDiagram(slug: string): AdminDiagram | undefined {
  return ADMIN_DIAGRAMS.find((diagram) => diagram.slug === slug);
}
