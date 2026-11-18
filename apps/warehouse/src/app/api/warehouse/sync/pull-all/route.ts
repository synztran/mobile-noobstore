import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError, isSameOriginMutation } from "@/lib/warehouse/guards";
import { pullAllFromAdmin } from "@/lib/warehouse/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) {
    return jsonError(
      auth.status === 401 ? "Unauthorized" : "Forbidden",
      auth.status
    );
  }

  if (!isSameOriginMutation(request)) {
    return jsonError("Invalid request origin.", 403);
  }

  try {
    const result = await pullAllFromAdmin(auth.client, auth.user.id);
    return NextResponse.json(
      {
        success: true,
        message: `Đã kéo thành công ${result.total} sản phẩm từ Admin (${result.created} tạo mới, ${result.updated} cập nhật).`,
        ...result,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[pull-all] Failed to pull canonical catalog:", error);
    return jsonError(
      error instanceof Error ? error.message : "Unable to pull catalog.",
      500
    );
  }
}
