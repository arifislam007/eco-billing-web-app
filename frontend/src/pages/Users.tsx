import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Plus, ShieldCheck, UserRound } from "lucide-react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Panel,
  SegmentedControl,
  useConfirm,
} from "../components/ui";
import { useToast } from "../components/Toast";

interface AppUser {
  id: string;
  email: string;
  role: "admin" | "staff";
  active: boolean;
  createdAt: string;
}

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function refresh() {
    setUsers(await api.get<AppUser[]>("/users"));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/users", { email, password, role });
      toast(`${email} added as ${role}`);
      setEmail("");
      setPassword("");
      setRole("staff");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add user");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: AppUser) {
    if (u.active) {
      const ok = await confirm({
        title: `Deactivate ${u.email}?`,
        message: "They won't be able to sign in until reactivated.",
        confirmLabel: "Deactivate",
        tone: "primary",
      });
      if (!ok) return;
    }
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      toast(`${u.email} ${u.active ? "deactivated" : "activated"}`);
      await refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to update user", "critical");
    }
  }

  async function toggleRole(u: AppUser) {
    const next = u.role === "admin" ? "staff" : "admin";
    const ok = await confirm({
      title: `Make ${u.email} ${next}?`,
      message: next === "admin" ? "Admins have full access to every screen." : "Staff can only use Monthly Entry and Vouchers.",
      confirmLabel: `Make ${next}`,
      tone: "primary",
    });
    if (!ok) return;
    try {
      await api.patch(`/users/${u.id}`, { role: next });
      toast(`${u.email} is now ${next}`);
      await refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to update user", "critical");
    }
  }

  function startReset(u: AppUser) {
    setResetTarget(u);
    setResetPassword("");
    setResetError(null);
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    setResetting(true);
    try {
      await api.patch(`/users/${resetTarget.id}`, { password: resetPassword });
      toast(`Password reset for ${resetTarget.email}`);
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader title="Users" subtitle="Admins have full access. Staff can only use Monthly Entry and Vouchers." />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Panel title="Add a user" className="lg:sticky lg:top-24">
          <form onSubmit={onAdd} className="space-y-3">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff2@econet.local" required />
            </Field>
            <Field label="Password" hint="At least 8 characters.">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </Field>
            <Field label="Role">
              <SegmentedControl
                value={role}
                onChange={setRole}
                className="w-full [&>button]:flex-1"
                options={[
                  { value: "staff", label: "Staff" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </Field>
            <p className="text-xs text-ink-muted">
              {role === "admin" ? "Full access to every screen." : "Monthly Entry and Vouchers only."}
            </p>
            {error && <Banner tone="critical">{error}</Banner>}
            <Button type="submit" loading={busy} className="w-full">
              {!busy && <Plus size={15} />} Add user
            </Button>
          </form>
        </Panel>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-[15px] font-semibold text-ink">All users</h3>
          </div>
          <DataTable<AppUser>
            rows={users}
            rowKey={(u) => u.id}
            columns={[
              {
                key: "email",
                header: "Email",
                primary: true,
                cell: (u) => (
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.email[0]?.toUpperCase()}
                    </span>
                    <span className="truncate font-medium">{u.email}</span>
                    {u.id === me?.id && <Badge>You</Badge>}
                  </span>
                ),
              },
              {
                key: "role",
                header: "Role",
                cell: (u) => (
                  <Badge tone={u.role === "admin" ? "accent" : "neutral"}>
                    {u.role === "admin" ? <ShieldCheck size={12} className="mr-1" /> : <UserRound size={12} className="mr-1" />}
                    {u.role === "admin" ? "Admin" : "Staff"}
                  </Badge>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (u) => <Badge tone={u.active ? "good" : "neutral"}>{u.active ? "Active" : "Inactive"}</Badge>,
              },
            ]}
            actions={(u) => (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggleRole(u)}>
                  Make {u.role === "admin" ? "staff" : "admin"}
                </Button>
                <IconButton label={`Reset password for ${u.email}`} onClick={() => startReset(u)}>
                  <KeyRound size={15} />
                </IconButton>
                <Button size="sm" variant={u.active ? "danger" : "secondary"} onClick={() => toggleActive(u)}>
                  {u.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            )}
          />
        </Card>
      </div>

      {resetTarget && (
        <Modal title="Reset password" description={`Set a new password for ${resetTarget.email}.`} onClose={() => setResetTarget(null)}>
          <form onSubmit={submitReset} className="space-y-4">
            <Field label="New password" hint="At least 8 characters.">
              <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} minLength={8} required autoFocus />
            </Field>
            {resetError && <Banner tone="critical">{resetError}</Banner>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={resetting}>
                {!resetting && <KeyRound size={15} />} Save new password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
