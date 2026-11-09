import { NextRequest, NextResponse } from "next/server";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { parseDebateRequest } from "@/lib/debate-request";
import { SmartphoneDevice } from "@/lib/seed-data";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import {
  createDebateStream,
  sanitizeDebatePrompt,
  synthesizeGroundedDebate,
} from "@/lib/debate-service";

const catalogById = new Map(
  FULL_UNIFIED_CATALOG.map((device) => [device.id, device] as const)
);

function isDeviceObject(val: unknown): val is SmartphoneDevice {
  if (typeof val !== "object" || val === null) {
    return false;
  }
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.specs === "object" &&
    obj.specs !== null
  );
}

export async function POST(req: NextRequest | Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", error: "Body must be valid JSON." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "Body must be a JSON object." },
      { status: 400 }
    );
  }

  const rawBody = body as Record<string, unknown>;

  let deviceA: SmartphoneDevice | undefined;
  let deviceB: SmartphoneDevice | undefined;
  let prompt = "";
  let weights: Record<string, number> | undefined;
  const isNewSchema = "deviceA" in rawBody && "deviceB" in rawBody;

  if (isNewSchema) {
    // New Milestone 4 schema: { deviceA: Device, deviceB: Device, weights?, prompt? }
    if (!isDeviceObject(rawBody.deviceA) || !isDeviceObject(rawBody.deviceB)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "deviceA and deviceB must be valid smartphone device objects.",
        },
        { status: 400 }
      );
    }

    deviceA = rawBody.deviceA;
    deviceB = rawBody.deviceB;
    prompt = typeof rawBody.prompt === "string"
      ? rawBody.prompt
      : typeof rawBody.query === "string"
      ? rawBody.query
      : "";

    if (
      typeof rawBody.weights === "object" &&
      rawBody.weights !== null &&
      !Array.isArray(rawBody.weights)
    ) {
      weights = rawBody.weights as Record<string, number>;
    }
  } else {
    // Legacy schema: { query, deviceAId, deviceBId }
    const parsed = parseDebateRequest(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: parsed.error },
        { status: 400 }
      );
    }

    const { query, deviceAId, deviceBId } = parsed.value;
    deviceA = catalogById.get(deviceAId);
    deviceB = catalogById.get(deviceBId);

    if (!deviceA || !deviceB) {
      return NextResponse.json(
        {
          ok: false,
          code: "DEVICE_NOT_FOUND",
          error: "One or both selected devices are not in the server catalog.",
        },
        { status: 404 }
      );
    }

    prompt = query;
  }

  // 1. Sanitize user prompt to prevent prompt injection & delimiter breakout
  const sanitizedPrompt = sanitizeDebatePrompt(prompt) || "Best overall flagship balance";

  // 2. Token-bucket rate limiting enforcement (5 req/min, burst 2)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMIT_EXCEEDED",
        error: `Rate limit exceeded. Maximum 5 requests per minute (burst 2). Please wait ${rateLimit.resetSeconds} seconds.`,
        retryAfter: rateLimit.resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetMs / 1000)),
        },
      }
    );
  }

  // 3. Determine whether to return an SSE ReadableStream or legacy JSON
  const acceptHeader = req.headers.get("accept") || "";
  const wantsSSE =
    acceptHeader.includes("text/event-stream") ||
    rawBody.stream === true;
  const isExplicitlyJsonOnly =
    acceptHeader === "application/json" && !wantsSSE;

  const shouldStream = wantsSSE || (isNewSchema && !isExplicitlyJsonOnly);

  if (shouldStream) {
    try {
      const stream = createDebateStream({
        deviceA,
        deviceB,
        prompt: sanitizedPrompt,
        weights,
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } catch {
      // Local deterministic fallback guarantee: never crash or return 500
      const fallbackDebate = synthesizeGroundedDebate({
        deviceA,
        deviceB,
        prompt: sanitizedPrompt,
        weights,
      });
      return NextResponse.json({
        ok: true,
        intelligence: fallbackDebate.intelligence,
        debate: fallbackDebate,
      });
    }
  }

  // 4. Return standard deterministic JSON response
  try {
    const debate = synthesizeGroundedDebate({
      deviceA,
      deviceB,
      prompt: sanitizedPrompt,
      weights,
    });

    return NextResponse.json({
      ok: true,
      intelligence: debate.intelligence,
      debate,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "DEBATE_GENERATION_FAILED",
        error: "The deterministic debate could not be generated.",
      },
      { status: 500 }
    );
  }
}
