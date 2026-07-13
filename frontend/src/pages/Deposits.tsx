import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Deposit, Partner } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th, Thead } from "../components/ui";

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

  async function remove(id: string) {
    await api.delete(`/deposits/${id}`);
    await refresh();
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const total = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Deposits" subtitle={selectedMonth.label} />

      <Card className="p-5">
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
              min={0.01}
              step="0.01"
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
            {deposits.map((d) => (
              <tr key={d.id}>
                <Td className="text-ink-secondary">{new Date(d.date).toLocaleDateString()}</Td>
                <Td className="font-medium">
                  {d.partner?.name ?? partners.find((p) => p.id === d.partnerId)?.name}
                </Td>
                <Td className="text-right tabular">{money(d.amount)}</Td>
                <Td className="capitalize text-ink-secondary">{d.medium}</Td>
                <Td className="text-ink-secondary">{d.ref ?? "—"}</Td>
                <Td className="text-right">
                  <button className="text-critical hover:underline text-xs" onClick={() => remove(d.id)}>
                    Delete
                  </button>
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
