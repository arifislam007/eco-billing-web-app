const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem("econet_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("econet_token", token);
  else localStorage.removeItem("econet_token");
}

// 401s from these paths are a business-logic result (wrong password), not
// evidence the session/token itself is bad - don't force a global logout.
const SESSION_EXEMPT_PATHS = ["/auth/login", "/auth/change-password"];

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !SESSION_EXEMPT_PATHS.includes(path)) {
      window.dispatchEvent(new Event("econet:session-expired"));
    }
    const message =
      typeof body?.error === "string" ? body.error : JSON.stringify(body?.error ?? res.statusText);
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
