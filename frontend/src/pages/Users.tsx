import { Fragment, useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Table, Td, Th, Thead } from "../components/ui";

interface AppUser {
  id: string;
  email: string;
  role: "admin" | "staff";
  active: boolean;
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
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
    await api.patch(`/users/${u.id}`, { active: !u.active });
    await refresh();
  }

  async function toggleRole(u: AppUser) {
    await api.patch(`/users/${u.id}`, { role: u.role === "admin" ? "staff" : "admin" });
    await refresh();
  }

  function startReset(id: string) {
    setResetTargetId(id);
    setResetPassword("");
    setResetError(null);
  }

  async function submitReset(id: string) {
    setResetError(null);
    setResetting(true);
    try {
      await api.patch(`/users/${id}`, { password: resetPassword });
      setResetTargetId(null);
      setResetPassword("");
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        subtitle="Admins have full access. Staff can only use Monthly Entry and Vouchers."
      />

      <Card className="p-5">
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff2@econet.local"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 8 characters"
              minLength={8}
              required
            />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as "admin" | "staff")}>
              <option value="staff">Staff (Monthly Entry + Vouchers)</option>
              <option value="admin">Admin (full access)</option>
            </Select>
          </Field>
          <Button type="submit" loading={busy}>
            Add User
          </Button>
        </form>
        {error && <p className="text-sm text-critical mt-3">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <Td className="font-medium">{u.email}</Td>
                  <Td>
                    <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{u.role}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={u.active ? "good" : "neutral"}>{u.active ? "active" : "inactive"}</Badge>
                  </Td>
                  <Td className="text-right space-x-3">
                    <button className="text-accent hover:underline text-sm" onClick={() => toggleRole(u)}>
                      Make {u.role === "admin" ? "staff" : "admin"}
                    </button>
                    <button className="text-accent hover:underline text-sm" onClick={() => toggleActive(u)}>
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="text-accent hover:underline text-sm"
                      onClick={() => (resetTargetId === u.id ? setResetTargetId(null) : startReset(u.id))}
                    >
                      Reset password
                    </button>
                  </Td>
                </tr>
                {resetTargetId === u.id && (
                  <tr className="bg-page">
                    <Td colSpan={4}>
                      <div className="flex flex-wrap items-end gap-3">
                        <Field label={`New password for ${u.email}`}>
                          <Input
                            type="password"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            placeholder="min. 8 characters"
                            minLength={8}
                            className="w-64"
                            autoFocus
                          />
                        </Field>
                        <Button size="sm" loading={resetting} onClick={() => submitReset(u.id)}>
                          Save new password
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setResetTargetId(null)}>
                          Cancel
                        </Button>
                      </div>
                      {resetError && <p className="text-sm text-critical mt-2">{resetError}</p>}
                    </Td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
