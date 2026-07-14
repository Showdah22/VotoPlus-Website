// Fetch wrapper con Bearer JWT automatico.
// Base URL letta da .env (VITE_BACKEND_URL) al build time.

const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  "https://votop-maturita.preview.emergentagent.com";

export class ApiError extends Error {
  status: number;
  detail?: string;
  /**
   * Payload completo di `detail` quando il backend lo invia come oggetto
   * strutturato (es. 409 con `{ code, provider, current_sku, target_sku }`).
   * Undefined per errori con detail piatto (stringa) o 422 (array).
   */
  detailObj?: Record<string, unknown>;
  /**
   * Codice diagnostico letto da `detail.code`. Undefined se non presente.
   * Esempi: "use_portal_to_switch", "already_on_this_sku",
   * "already_on_other_provider".
   */
  code?: string;
  constructor(
    status: number,
    message: string,
    detail?: string,
    detailObj?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.detailObj = detailObj;
    if (detailObj && typeof detailObj.code === "string") {
      this.code = detailObj.code;
    }
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
    // FastAPI 422 (ValidationError) mette i dettagli in data.detail come array
    // di oggetti { loc, msg, type }. Estraiamo il primo msg per un errore
    // parlante ("field required: title") invece di un opaco "HTTP 422".
    let msg = `HTTP ${res.status}`;
    let detailObj: Record<string, unknown> | undefined;
    if (isRecord(data)) {
      if (typeof data.detail === "string") {
        msg = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0] as any;
        const field = Array.isArray(first?.loc) ? first.loc.slice(-1)[0] : null;
        const em = first?.msg || "campo non valido";
        msg = field ? `${em} (${field})` : em;
      } else if (isRecord(data.detail)) {
        // Nuovo formato usato da Stripe billing (409 conflict etc.):
        // detail = { code, provider, message, ... } → serializziamo il
        // messaggio per gli utilizzatori legacy e conserviamo l'oggetto
        // strutturato in ApiError.detailObj/code per gli utilizzatori nuovi.
        detailObj = data.detail;
        if (typeof detailObj.message === "string") {
          msg = detailObj.message as string;
        } else if (typeof detailObj.code === "string") {
          msg = detailObj.code as string;
        }
      } else if (typeof data.message === "string") {
        msg = data.message;
      }
    }
    throw new ApiError(
      res.status,
      msg,
      typeof data === "string" ? data : undefined,
      detailObj,
    );
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
  signup: (body: { email: string; username: string; password: string }) =>
    request<{ access_token: string; user: any }>("/api/auth/signup", { method: "POST", body }),

  login: (body: { email: string; password: string }) =>
    request<{ access_token: string; user: any }>("/api/auth/login", { method: "POST", body }),

  // Google Auth via Emergent hosted OAuth. Il session_id ricevuto dal
  // deep-link `votoplus://auth?session_id=...` viene passato al backend
  // come `session_token`. Il backend lo scambia una-tantum con Emergent
  // (`session-data` endpoint) e restituisce JWT + user. Vedi routes/auth.py.
  googleAuth: (session_id: string) =>
    request<{ access_token: string; user: any }>("/api/auth/google", {
      method: "POST",
      body: { session_token: session_id },
    }),

  me: (token: string) => request<any>("/api/auth/me", { token }),

  // Verifica email OTP (auto-inviata al signup, si può richiedere di nuovo)
  emailSendOtp: (token: string) =>
    request<{ sent: boolean; expires_in_seconds?: number }>(
      "/api/auth/email/send-otp",
      { method: "POST", token },
    ),
  emailResendOtp: (token: string) =>
    request<{ sent: boolean; expires_in_seconds?: number }>(
      "/api/auth/email/resend-otp",
      { method: "POST", token },
    ),
  emailVerifyOtp: (code: string, token: string) =>
    request<any>("/api/auth/email/verify-otp", {
      method: "POST",
      body: { code },
      token,
    }),
  emailStatus: (token: string) =>
    request<{ verified: boolean; email: string }>("/api/auth/email/status", { token }),

  // Wizard di setup profilo (una volta soltanto, come mobile)
  profileSetup: (
    body: { school_year: number; school_type: string; subjects: string[] },
    token: string,
  ) =>
    request<any>("/api/auth/profile-setup", { method: "POST", body, token }),

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

  mathHistory: (token: string) =>
    request<any[]>("/api/math/history", { token }),

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
  appChangelog: (installed?: string, platform: "android" | "ios" | "web" | "desktop" = "desktop") => {
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

  // Maturità Radar
  // - `radarSeason` restituisce lo stato attivo/dormiente e i messaggi UI.
  // - `radar` chiama il backend per generare i contenuti AI di uno specifico tab.
  radarSeason: (token: string) => request<{
    state: "active" | "dormant";
    wake_at: string; sleep_at: string; now: string;
    title: string; message: string; cta_label: string;
    year_archived: number; next_year: number;
  }>("/api/maturita/radar/season", { token }),
  radar: (body: { tab: string; subject?: string }, token: string) =>
    request<any>("/api/maturita/radar", { method: "POST", body, token }),

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
    body: { title?: string; subject?: string; text?: string; depth?: "small" | "medium" | "big"; source_material_id?: string; maturita_links?: boolean },
    token: string,
  ) => request<any>("/api/study/mindmap", { method: "POST", body, token }),
  mindmapsList: (token: string) => request<any[]>("/api/mindmaps", { token }),
  mindmapGet: (id: string, token: string) =>
    request<any>(`/api/mindmap/${encodeURIComponent(id)}`, { token }),

  // Study extract (URL / YouTube / PDF text)
  extractUrl: (body: { url: string }, token: string) =>
    request<{ text: string; source: string; title: string; truncated: boolean }>(
      "/api/study/extract/url", { method: "POST", body, token },
    ),
  extractYoutube: (body: { url: string; language?: string }, token: string) =>
    request<{ text: string; source: string; title: string; truncated: boolean }>(
      "/api/study/extract/youtube", { method: "POST", body, token },
    ),
  extractPdf: (body: { pdf_base64: string; max_pages?: number }, token: string) =>
    request<{ text: string; pages: number; truncated: boolean }>(
      "/api/study/pdf-extract", { method: "POST", body, token },
    ),

  // Quota & billing
  meQuota: (token: string) => request<any>("/api/me/quota", { token }),
  billingProducts: (token: string) => request<any>("/api/billing/products", { token }),

  // Stripe Desktop (Fase A+B — 2026-07)
  // Nota cross-provider: se l'utente ha già Premium via Apple/Google (mobile),
  // il backend risponde 409 e blocca il checkout. Vedi routes/stripe_billing.py.
  billingSubscriptionStatus: (token: string) =>
    request<{
      active: boolean;
      provider: "apple" | "google" | "stripe" | null;
      plan: string | null;
      plan_sku: string | null;
      plan_expires_at: string | null;
      is_trial: boolean;
      auto_renew: boolean;
      maturita_unlocked: boolean;
      maturita_expires_at: string | null;
      stripe_manage_url: string | null;
    }>("/api/billing/subscription-status", { token }),

  billingStripeCreateCheckout: (
    body: { sku: "premium" | "family" | "school_year" | "maturita" },
    token: string,
  ) =>
    request<{ checkout_url: string; session_id: string }>(
      "/api/billing/stripe/create-checkout-session",
      { method: "POST", body, token },
    ),

  // Stripe Billing Portal — cambio piano mensile ↔ annuale con proration,
  // gestione carta, download fatture, cancellazione.
  // Se `target_sku` è passato, apre direttamente il flusso "subscription_update"
  // con il nuovo price pre-selezionato (Stripe calcola la proration automatica).
  billingStripePortal: (
    body: {
      target_sku?: "premium" | "family" | "school_year" | "maturita";
      return_url?: string;
    },
    token: string,
  ) =>
    request<{ portal_url: string }>(
      "/api/billing/stripe/portal",
      { method: "POST", body, token },
    ),

  // Oral VOCE (STT+TTS OpenAI)
  oralVoiceStart: (
    body: {
      subject: string;
      severity?: "facile" | "medio" | "severo" | "spietato";
      topic?: string;
      voice?: "alloy" | "ash" | "coral" | "echo" | "fable" | "nova" | "onyx" | "sage" | "shimmer";
      mode?: "domande" | "esposizione";
      language_mode?: "immersione" | "misto" | "italiano";
    },
    token: string,
  ) => request<any>("/api/oral/voice/start", { method: "POST", body, token }),

  // /oral/voice/turn è multipart (audio file). Facciamo la fetch manualmente
  // perché request() serializza in JSON.
  oralVoiceTurn: async (attempt_id: string, audioBlob: Blob, token: string) => {
    const fd = new FormData();
    fd.append("attempt_id", attempt_id);
    fd.append("audio", audioBlob, `answer.${blobExt(audioBlob)}`);
    const res = await fetch(`${BASE_URL}/api/oral/voice/turn`, {
      method: "POST",
      body: fd,
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, (data as any)?.detail || `HTTP ${res.status}`);
    }
    return data as any;
  },

  // Oral REALTIME (WebRTC bidirezionale)
  oralRealtimeSession: (
    body: {
      subject: string;
      severity?: string;
      topic: string;
      voice?: string;
      mode?: "domande" | "esposizione";
      duration_min?: number;
      language_mode?: "immersione" | "misto" | "italiano";
      material_ids?: string[];
    },
    token: string,
  ) => request<any>("/api/oral/realtime/session", { method: "POST", body, token }),

  oralRealtimeFinish: (
    body: {
      attempt_id: string;
      grade?: number;
      grade_label?: string;
      summary?: string;
      strengths?: string[];
      weaknesses?: string[];
      transcript?: Array<{ role: string; text: string }>;
    },
    token: string,
  ) => request<any>("/api/oral/realtime/finish", { method: "POST", body, token }),
};

function blobExt(b: Blob): string {
  const t = (b.type || "").toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("mp4") || t.includes("m4a")) return "m4a";
  if (t.includes("mp3")) return "mp3";
  return "webm";
}

export const backendUrl = BASE_URL;
