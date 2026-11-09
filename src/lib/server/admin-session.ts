import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "phoneindex_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret(): string | undefined {
  return process.env.PHONEINDEX_ADMIN_SECRET;
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.PHONEINDEX_ADMIN_KEY &&
      process.env.PHONEINDEX_ADMIN_KEY.length >= 12 &&
      getSecret() &&
      getSecret()!.length >= 32
  );
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validateAdminKey(candidate: string): boolean {
  const configured = process.env.PHONEINDEX_ADMIN_KEY;
  return Boolean(configured && safeEqual(candidate, configured));
}

export function createAdminSessionToken(now = Date.now()): string {
  const secret = getSecret();
  if (!secret) throw new Error("Admin session secret is not configured.");
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url");
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  now = Date.now()
): boolean {
  const secret = getSecret();
  if (!secret || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, signPayload(payload, secret))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    return typeof data.exp === "number" && data.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function isAdminRequest(request: NextRequest): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
