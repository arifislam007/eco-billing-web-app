import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, setToken } from "../api/client";

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "staff";
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Auto-logout after this long with no mouse/keyboard/touch activity.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart"] as const;

export const SESSION_MESSAGE_KEY = "econet_session_message";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("econet_user");
    return stored ? JSON.parse(stored) : null;
  });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
      email,
      password,
    });
    setToken(res.token);
    localStorage.setItem("econet_user", JSON.stringify(res.user));
    setUser(res.user);
  }

  // Internal - carries a reason so the login page can explain why the user
  // landed there. The context's public `logout` (below) is reason-less and
  // safe to bind directly to onClick handlers.
  function logoutWithReason(reason?: "idle" | "expired") {
    setToken(null);
    localStorage.removeItem("econet_user");
    setUser(null);
    if (reason === "idle") {
      sessionStorage.setItem(SESSION_MESSAGE_KEY, "You were logged out after 30 minutes of inactivity.");
    } else if (reason === "expired") {
      sessionStorage.setItem(SESSION_MESSAGE_KEY, "Your session expired. Please sign in again.");
    }
  }

  function logout() {
    logoutWithReason();
  }

  // Any 401 from the API (invalid/expired token) triggers this - see api/client.ts.
  useEffect(() => {
    function onSessionExpired() {
      logoutWithReason("expired");
    }
    window.addEventListener("econet:session-expired", onSessionExpired);
    return () => window.removeEventListener("econet:session-expired", onSessionExpired);
  }, []);

  // Idle timeout: only runs while logged in.
  useEffect(() => {
    if (!user) return;

    function resetTimer() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => logoutWithReason("idle"), IDLE_TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
