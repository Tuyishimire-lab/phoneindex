export const MAX_DEBATE_QUERY_LENGTH = 500;
const MAX_DEVICE_ID_LENGTH = 128;
const ALLOWED_FIELDS = new Set(["query", "deviceAId", "deviceBId"]);

export interface DebateRequestInput {
  query: string;
  deviceAId: string;
  deviceBId: string;
}

export type DebateRequestParseResult =
  | { ok: true; value: DebateRequestInput }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDebateRequest(body: unknown): DebateRequestParseResult {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const unsupportedField = Object.keys(body).find(
    (field) => !ALLOWED_FIELDS.has(field)
  );
  if (unsupportedField) {
    return {
      ok: false,
      error: `Unsupported request field: ${unsupportedField}.`,
    };
  }

  if (typeof body.query !== "string" || !body.query.trim()) {
    return { ok: false, error: "Query must be a non-empty string." };
  }
  const query = body.query.trim();
  if (query.length > MAX_DEBATE_QUERY_LENGTH) {
    return {
      ok: false,
      error: `Query must be ${MAX_DEBATE_QUERY_LENGTH} characters or fewer.`,
    };
  }

  for (const field of ["deviceAId", "deviceBId"] as const) {
    const value = body[field];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > MAX_DEVICE_ID_LENGTH
    ) {
      return { ok: false, error: `${field} must be a valid device ID.` };
    }
  }

  const deviceAId = (body.deviceAId as string).trim();
  const deviceBId = (body.deviceBId as string).trim();
  if (deviceAId === deviceBId) {
    return { ok: false, error: "Choose two different devices to compare." };
  }

  return {
    ok: true,
    value: { query, deviceAId, deviceBId },
  };
}
