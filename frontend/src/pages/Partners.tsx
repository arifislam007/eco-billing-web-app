import { useEffect, useState, type FormEvent } from "react";
import { Phone, Plus, Search } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Partner } from "../api/types";
import { Badge, Banner, Button, Card, DataTable, Field, Input, PageHeader, Panel, SegmentedControl, useConfirm } from "../components/ui";
import { useToast } from "../components/Toast";

export default function Partners() {
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

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
      toast(`${name} added`);
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
    if (p.active) {
      const ok = await confirm({
        title: `Deactivate ${p.name}?`,
        message: "They'll be hidden from new entries, deposits and vouchers. Their past records stay, and you can reactivate them anytime.",
        confirmLabel: "Deactivate",
        tone: "primary",
      });
      if (!ok) return;
    }
    await api.patch(`/partners/${p.id}`, { active: !p.active });
    toast(`${p.name} ${p.active ? "deactivated" : "activated"}`);
    await refresh();
  }

  const activeCount = partners.filter((p) => p.active).length;
  const shown = partners.filter(
    (p) =>
      (filter === "all" || (filter === "active" ? p.active : !p.active)) &&
      (!query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.phone ?? "").includes(query))
  );

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader title="Partners" subtitle={`${activeCount} active of ${partners.length} reseller partners.`} />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Panel title="Add a partner" className="lg:sticky lg:top-24">
          <form onSubmit={onAdd} className="space-y-3">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jahid Bhai" required />
            </Field>
            <Field label="Phone (optional)">
              <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </Field>
            {error && <Banner tone="critical">{error}</Banner>}
            <Button type="submit" loading={busy} className="w-full">
              {!busy && <Plus size={15} />} Add partner
            </Button>
          </form>
        </Panel>

        <Card className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" className="pl-9" aria-label="Search partners" />
            </div>
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <DataTable<Partner>
            rows={shown}
            rowKey={(p) => p.id}
            empty={partners.length ? "No partners match." : "No partners yet. Add the first one."}
            columns={[
              { key: "name", header: "Name", primary: true, cell: (p) => <span className="font-medium">{p.name}</span> },
              {
                key: "phone",
                header: "Phone",
                cell: (p) =>
                  p.phone ? (
                    <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-accent">
                      <Phone size={13} /> {p.phone}
                    </a>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  ),
              },
              {
                key: "status",
                header: "Status",
                cell: (p) => <Badge tone={p.active ? "good" : "neutral"}>{p.active ? "Active" : "Inactive"}</Badge>,
              },
            ]}
            actions={(p) => (
              <Button size="sm" variant={p.active ? "ghost" : "secondary"} onClick={() => toggleActive(p)}>
                {p.active ? "Deactivate" : "Activate"}
              </Button>
            )}
          />
        </Card>
      </div>
    </div>
  );
}
