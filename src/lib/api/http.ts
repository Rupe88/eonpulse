export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Json = Record<string, unknown>;

function getMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const o = body as Json;
    const msg = o.message;
    if (typeof msg === "string" && msg.length) return msg;
    if (Array.isArray(o.message)) {
      const first = o.message[0];
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

export async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = undefined;
  if (text.length) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("Invalid JSON from server", res.status, text);
    }
  }

  if (!res.ok) {
    const message = getMessageFromBody(
      data,
      res.statusText || `Request failed (${res.status})`,
    );
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
