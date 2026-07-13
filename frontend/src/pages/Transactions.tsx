import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Transaction } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Button, Card, EmptyState, Field, Input, PageHeader, StatTile, Table, Td, Th, Thead } from "../components/ui";

export default function Transactions() {
  const { selectedMonth } = useMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState("0");
  const [details, setDetails] = useState("");
  const [send, setSend] = useState("");
  const [receive, setReceive] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!selectedMonth) return;
    const data = await api.get<{ transactions: Transaction[]; balance: string }>(
      `/transactions?monthId=${selectedMonth.id}`
    );
    setTransactions(data.transactions);
    setBalance(data.balance);
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
      await api.post("/transactions", {
        monthId: selectedMonth.id,
        details,
        send: Number(send) || 0,
        receive: Number(receive) || 0,
        comment: comment || undefined,
      });
      setDetails("");
      setSend("");
      setReceive("");
      setComment("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add transaction");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/transactions/${id}`);
    await refresh();
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions (bKash Ledger)"
        subtitle={selectedMonth.label}
        actions={
          <StatTile
            label="Balance"
            value={money(balance)}
            tone={Number(balance) < 0 ? "critical" : "neutral"}
          />
        }
      />

      <Card className="p-5">
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Details">
            <Input value={details} onChange={(e) => setDetails(e.target.value)} className="w-48" required />
          </Field>
          <Field label="Send (out)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={send}
              onChange={(e) => setSend(e.target.value)}
              className="w-28"
            />
          </Field>
          <Field label="Receive (in)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={receive}
              onChange={(e) => setReceive(e.target.value)}
              className="w-28"
            />
          </Field>
          <Field label="Comment (optional)">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} className="w-48" />
          </Field>
          <Button type="submit" loading={busy}>
            Add
          </Button>
        </form>
        {error && <p className="text-sm text-critical mt-3">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Details</Th>
              <Th className="text-right">Send</Th>
              <Th className="text-right">Receive</Th>
              <Th className="text-right">Balance</Th>
              <Th>Comment</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <Td className="text-ink-secondary">{new Date(t.date).toLocaleDateString()}</Td>
                <Td className="font-medium">{t.details}</Td>
                <Td className="text-right tabular text-critical">
                  {Number(t.send) ? money(t.send) : "—"}
                </Td>
                <Td className="text-right tabular text-good">
                  {Number(t.receive) ? money(t.receive) : "—"}
                </Td>
                <Td className="text-right tabular font-medium">{money(t.runningBalance ?? 0)}</Td>
                <Td className="text-ink-secondary">{t.comment ?? "—"}</Td>
                <Td className="text-right">
                  <button className="text-critical hover:underline text-xs" onClick={() => remove(t.id)}>
                    Delete
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
