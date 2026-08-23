import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SESSION_MESSAGE_KEY, useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Button, Card, Field, Input } from "../components/ui";
import logo from "../assets/eco-logo.jpg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionMessage] = useState(() => {
    const msg = sessionStorage.getItem(SESSION_MESSAGE_KEY);
    if (msg) sessionStorage.removeItem(SESSION_MESSAGE_KEY);
    return msg;
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4 relative overflow-hidden">
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "linear-gradient(135deg, var(--color-sidebar), var(--color-sidebar-to))" }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "linear-gradient(135deg, var(--color-sidebar-to), var(--color-sidebar))" }}
      />
      <Card className="w-full max-w-sm p-8 shadow-[var(--shadow-lg)] relative">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1.5 shadow-[var(--shadow-sm)] mb-3">
            <img src={logo} alt="Econet" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-semibold text-ink leading-none">Econet</h1>
          <p className="text-xs text-ink-muted mt-1">ISP Accounting &amp; Voucher App</p>
        </div>

        {sessionMessage && (
          <p className="text-sm text-warning bg-warning-soft rounded-lg px-3 py-2 mb-4">
            {sessionMessage}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              required
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              required
            />
          </Field>

          {error && <p className="text-sm text-critical">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
