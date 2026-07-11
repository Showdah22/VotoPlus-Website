// Fetch wrapper con Bearer JWT automatico.
// Base URL letta da .env (VITE_BACKEND_URL) al build time.

const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  "https://votop-maturita.preview.emergentagent.com";

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

type RequestOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", token, body, headers = {} } = opts;
  const url = `${BASE_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data: unknown = text ? safeParse(text) : null;

  if (!res.ok) {
    const msg =
      (isRecord(data) && typeof data.detail === "string" && data.detail) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, typeof data === "string" ? data : undefined);
  }
  return data as T;
}

function safeParse(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ access_token: string; user: any }>("/api/auth/login", { method: "POST", body }),

  me: (token: string) => request<any>("/api/auth/me", { token }),

  dashboard: (token: string) => request<any>("/api/dashboard", { token }),

  gradesStats: (token: string) => request<any>("/api/grades/stats", { token }),

  coachNudge: (token: string) => request<any>("/api/coach/nudge", { token }),

  studyAnalyze: (
    body: {
      title?: string;
      subject?: string;
      text?: string;
      image_base64?: string;
      difficulty?: string;
    },
    token: string,
  ) => request<any>("/api/study/analyze", { method: "POST", body, token }),

  studyHistory: (token: string) =>
    request<any[]>("/api/study/history", { token }),

  mathSolve: (
    body: { problem: string; image_base64?: string; difficulty?: string },
    token: string,
  ) => request<any>("/api/math/solve", { method: "POST", body, token }),
};

export const backendUrl = BASE_URL;
