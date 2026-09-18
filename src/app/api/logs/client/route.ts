import { logger } from "~/lib/logging/server";
import { route } from "~/lib/http";

const MAX_BODY_BYTES = 16_000;

export const POST = route(async (request) => {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return Response.json({ ok: false }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!isClientErrorPayload(payload)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  logger.error("client.unhandled_error", payload.error, {
    source: payload.context.source ?? "unknown",
    client: payload.context,
  });

  return Response.json({ ok: true });
});

function isClientErrorPayload(value: unknown): value is {
  error: unknown;
  context: Record<string, unknown>;
} {
  if (typeof value !== "object" || value === null) {return false;}
  const candidate = value as Record<string, unknown>;

  return "error" in candidate && typeof candidate.context === "object" && candidate.context !== null;
}
