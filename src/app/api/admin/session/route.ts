import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  isAdminConfigured,
  isAdminRequest,
  validateAdminKey,
} from "@/lib/server/admin-session";

export function GET(request: NextRequest) {
  return NextResponse.json({
    configured: isAdminConfigured(),
    authenticated: isAdminRequest(request),
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, code: "ADMIN_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const key =
    typeof body === "object" && body !== null && "key" in body
      ? (body as { key?: unknown }).key
      : undefined;
  if (typeof key !== "string" || key.length > 256 || !validateAdminKey(key)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_ADMIN_KEY" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true, authenticated: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true, authenticated: false });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return response;
}
