import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Partner } from "../api/types";
import { Badge, Button, Card, Field, Input, PageHeader, Table, Td, Th, Thead } from "../components/ui";

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setPartners(await api.get<Partner[]>("/partners"));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/partners", { name, phone: phone || undefined });
      setName("");
      setPhone("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add partner");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Partner) {
    await api.patch(`/partners/${p.id}`, { active: !p.active });
    await refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Partners" subtitle="Manage the reseller partner list" />

      <Card className="p-5">
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jahid Bhai"
              required
            />
          </Field>
          <Field label="Phone (optional)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>
            Add Partner
          </Button>
        </form>
        {error && <p className="text-sm text-critical mt-3">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td className="text-ink-secondary">{p.phone ?? "—"}</Td>
                <Td>
                  <Badge tone={p.active ? "good" : "neutral"}>{p.active ? "active" : "inactive"}</Badge>
                </Td>
                <Td className="text-right">
                  <button className="text-accent hover:underline text-sm" onClick={() => toggleActive(p)}>
                    {p.active ? "Deactivate" : "Activate"}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
