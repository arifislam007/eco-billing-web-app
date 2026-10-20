import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { SESSION_MESSAGE_KEY, useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Banner, Button, Field, Input } from "../components/ui";
import logo from "../assets/eco-logo.jpg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-surface">
      {/* Brand panel (desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#4a30bd] via-[#5b3fd6] to-[#7c5cf0] text-white relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center">
            <img src={logo} alt="" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Econet</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Every partner, deposit and taka — in one place.</h2>
          <p className="mt-3 text-white/75">
            Monthly collections, commissions, dues, costs and the bKash ledger, with vouchers ready to print or share.
          </p>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Econet · ISP Accounting</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-5 py-10 bg-page lg:bg-surface">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-1.5 ring-1 ring-border mb-3">
              <img src={logo} alt="Econet" className="w-full h-full object-contain" />
            </div>
            <div className="text-lg font-semibold text-ink">Econet</div>
            <div className="text-xs text-ink-muted">ISP Accounting &amp; Vouchers</div>
          </div>

          <h1 className="text-2xl font-semibold text-ink tracking-tight">Sign in</h1>
          <p className="text-sm text-ink-muted mt-1 mb-6">Use the email and password your admin gave you.</p>

          {sessionMessage && (
            <Banner tone="warning" className="mb-4">
              {sessionMessage}
            </Banner>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="you@econet.local"
                  required
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-muted hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && <Banner tone="critical">{error}</Banner>}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
