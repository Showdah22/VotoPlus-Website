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

  gradesRealList: (token: string) =>
    request<any[]>("/api/grades/real", { token }),

  gradesRealAdd: (
    body: { subject: string; value: number; date?: string; weight?: number; note?: string; kind?: string },
    token: string,
  ) => request<any>("/api/grades/real", { method: "POST", body, token }),

  eventsList: (token: string) => request<any[]>("/api/events", { token }),

  eventsAdd: (
    body: { type: string; subject: string; title?: string; topic?: string; date: string; time?: string },
    token: string,
  ) => request<any>("/api/events", { method: "POST", body, token }),

  // ===== Sprint 2 =====

  // Flashcards
  flashcardsList: (token: string) => request<any[]>("/api/flashcards", { token }),
  flashcardsAdd: (
    body: { front: string; back: string; subject?: string; material_id?: string | null },
    token: string,
  ) => request<any>("/api/flashcards", { method: "POST", body, token }),
  flashcardsDelete: (id: string, token: string) =>
    request<{ deleted: number }>(`/api/flashcards/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token,
    }),

  // Vocab AI
  vocabLookup: (
    body: { word: string; lang?: string; context?: string },
    token: string,
  ) => request<any>("/api/vocab/lookup", { method: "POST", body, token }),
  vocabHistory: (token: string) => request<any[]>("/api/vocab/history", { token }),
  vocabHistoryDelete: (id: string, token: string) =>
    request<any>(`/api/vocab/history/${encodeURIComponent(id)}`, { method: "DELETE", token }),

  // Gamification / Achievements
  gamificationProgress: (token: string) => request<any>("/api/gamification/progress", { token }),

  // Changelog
  appChangelog: (installed?: string, platform: "android" | "ios" | "web" = "web") => {
    const params = new URLSearchParams({ platform });
    if (installed) params.set("installed", installed);
    return request<{ releases: any[] }>(`/api/app/changelog?${params.toString()}`);
  },

  // ===== Sprint 3 =====

  // Interrogazione orale (versione testuale desktop)
  oralStart: (
    body: {
      subject: string;
      severity?: "facile" | "medio" | "severo" | "spietato";
      topic?: string;
      mode?: "standard" | "lampo";
    },
    token: string,
  ) => request<any>("/api/oral/start", { method: "POST", body, token }),
  oralEvaluate: (
    body: {
      attempt_id: string;
      subject: string;
      severity: string;
      question: string;
      answer: string;
      difficulty?: string;
    },
    token: string,
  ) => request<any>("/api/oral/evaluate", { method: "POST", body, token }),
  oralHistory: (token: string) => request<any[]>("/api/oral/history", { token }),
  oralStats: (token: string) => request<any>("/api/oral/stats", { token }),

  // Tema (essay)
  essayPrompt: (
    body: { topic: string; type?: string; length?: string },
    token: string,
  ) => request<any>("/api/italian/essay-prompt", { method: "POST", body, token }),
  essayHistory: (token: string) => request<any[]>("/api/italian/essays", { token }),

  // Compito in classe (classwork)
  classworkStart: (
    body: {
      subject: string;
      n_items?: number;
      difficulty?: "base" | "standard" | "avanzato" | "maturita";
      duration_min?: number;
    },
    token: string,
  ) => request<any>("/api/classwork/start", { method: "POST", body, token }),
  classworkSubmit: (
    body: { classwork_id: string; answers: Array<{ index: number; answer: string }> },
    token: string,
  ) => request<any>("/api/classwork/submit", { method: "POST", body, token }),
  classworkHistory: (token: string) => request<any[]>("/api/classwork/history", { token }),
  classworkGet: (id: string, token: string) =>
    request<any>(`/api/classwork/${encodeURIComponent(id)}`, { token }),

  // Mindmap
  mindmapCreate: (
    body: { title?: string; subject?: string; text?: string; depth?: "small" | "medium" | "big"; source_material_id?: string },
    token: string,
  ) => request<any>("/api/study/mindmap", { method: "POST", body, token }),
  mindmapsList: (token: string) => request<any[]>("/api/mindmaps", { token }),
  mindmapGet: (id: string, token: string) =>
    request<any>(`/api/mindmap/${encodeURIComponent(id)}`, { token }),
};

export const backendUrl = BASE_URL;
