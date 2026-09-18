import { type DomainError, isDomainError } from "~/domain/errors";
import { logger } from "~/lib/logging/server";
import { randomUUID } from "node:crypto";

const statusByCode: Record<DomainError["code"], number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};

export function route<Context>(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    try {
      const response = await handler(request, context);
      const headers = new Headers(response.headers);
      headers.set("x-request-id", requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      logger.error("route.unhandled_error", error, {
        method: request.method,
        path: new URL(request.url).pathname,
        requestId,
      });
      const response = errorResponse(error);
      response.headers.set("x-request-id", requestId);

      return response;
    }
  };
}

function errorResponse(error: unknown): Response {
  if (isDomainError(error)) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...error.details,
      },
      { status: statusByCode[error.code] },
    );
  }

  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
