import { NextRequest } from "next/server";
import { submitOrder } from "@/modules/checkout/server/submit-order";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return submitOrder(request);
}
