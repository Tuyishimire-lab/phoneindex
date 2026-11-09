import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-session";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { ok: false, code: "ADMIN_REQUIRED", error: "Admin authorization required." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      code: "INGESTION_NOT_CONNECTED",
      error:
        "Automated ingestion is disabled until a sourced normalization pipeline is connected.",
    },
    { status: 501 }
  );
}
