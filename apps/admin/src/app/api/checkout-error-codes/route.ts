import { checkoutErrorCatalog } from "@/lib/checkout-error-catalog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  // Admin API access is authenticated and role-checked by middleware.
  return NextResponse.json({ errors: checkoutErrorCatalog });
}
