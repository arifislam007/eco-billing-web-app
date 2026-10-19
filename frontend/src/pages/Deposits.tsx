import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Deposit, Partner } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th, Thead, vizHues } from "../components/ui";
import { DepositSummary } from "../components/CostSummary";

export default function Deposits() {
  const { selectedMonth } = useMonth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");
  const [medium, setMedium] = useState<"cash" | "bkash" | "bank">("bkash");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!selectedMonth) return;
    const [p, d] = await Promise.all([
      api.get<Partner[]>("/partners?active=true"),
      api.get<Deposit[]>(`/deposits?monthId=${selectedMonth.id}`),
    ]);
    setPartners(p);
    setDeposits(d);
    if (!partnerId && p.length) setPartnerId(p[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth?.id]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!selectedMonth) return;
    setError(null);
    setBusy(true);
    try {
      await api.post("/deposits", {
        partnerId,
        monthId: selectedMonth.id,
        amount: Number(amount),
        medium,
        ref: ref || undefined,
      });
      setAmount("");
      setRef("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add deposit");
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: Deposit) {
    const name = partnerName(d);
    if (!window.confirm(`Delete deposit of ${money(d.amount)} from ${name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/deposits/${d.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete deposit");
    }
  }

  function partnerName(d: Deposit) {
    return d.partner?.name ?? partners.find((p) => p.id === d.partnerId)?.name ?? "—";
  }

  // Same colour per partner as in the summary strip.
  function partnerHue(id: string) {
    const i = partners.findIndex((p) => p.id === id);
    return i >= 0 ? vizHues[i % vizHues.length] : "var(--color-ink-muted)";
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const total = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" subtitle={selectedMonth.label} />

      <DepositSummary deposits={deposits} partners={partners} />

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-ink mb-3">Add a deposit</h3>
        {partners.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartnerId(p.id)}
                className={
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors " +
                  (partnerId === p.id
                    ? "bg-accent-soft text-accent border-accent/40"
                    : "bg-surface text-ink-secondary border-border hover:bg-page")
                }
              >
                <span className="w-2 h-2 rounded-sm mr-1.5" style={{ background: partnerHue(p.id) }} />
                {p.name}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Partner">
            <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={1}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32"
              required
            />
          </Field>
          <Field label="Medium">
            <Select value={medium} onChange={(e) => setMedium(e.target.value as typeof medium)}>
              <option value="bkash">bKash</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </Select>
          </Field>
          <Field label="Reference (optional)">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy}>
            Add Deposit
          </Button>
        </form>
        {error && <p className="text-sm text-critical mt-3">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Partner</Th>
              <Th className="text-right">Amount</Th>
              <Th>Medium</Th>
              <Th>Ref</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {deposits.length === 0 && (
              <tr>
                <Td colSpan={6} className="text-center text-ink-muted py-8">
                  No deposits added for this month yet.
                </Td>
              </tr>
            )}
            {deposits.map((d) => (
              <tr key={d.id}>
                <Td className="text-ink-secondary">{new Date(d.date).toLocaleDateString()}</Td>
                <Td>
                  <Badge>
                    <span className="w-2 h-2 rounded-sm mr-1.5" style={{ background: partnerHue(d.partnerId) }} />
                    {partnerName(d)}
                  </Badge>
                </Td>
                <Td className="text-right tabular">{money(d.amount)}</Td>
                <Td className="text-ink-secondary">{d.medium === "bkash" ? "bKash" : d.medium === "cash" ? "Cash" : "Bank"}</Td>
                <Td className="text-ink-secondary">{d.ref ?? "—"}</Td>
                <Td className="text-right">
                  <Button variant="danger" size="sm" onClick={() => remove(d)}>
                    Delete
                  </Button>
                </Td>
              </tr>
            ))}
            <tr className="font-semibold bg-page">
              <Td colSpan={2}>Total</Td>
              <Td className="text-right tabular">{money(total)}</Td>
              <Td colSpan={3}></Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
