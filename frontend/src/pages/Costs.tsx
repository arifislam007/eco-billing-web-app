import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { CostItem } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Button, Card, EmptyState, Field, Input, PageHeader, Table, Td, Th, Thead } from "../components/ui";

export default function Costs() {
  const { selectedMonth } = useMonth();
  const [items, setItems] = useState<CostItem[]>([]);
  const [totalCost, setTotalCost] = useState("0");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!selectedMonth) return;
    const data = await api.get<{ items: CostItem[]; totalCost: string }>(
      `/costs?monthId=${selectedMonth.id}`
    );
    setItems(data.items);
    setTotalCost(data.totalCost);
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
      await api.post("/costs", { monthId: selectedMonth.id, label, amount: Number(amount) });
      setLabel("");
      setAmount("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add cost item");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/costs/${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete cost item");
    }
  }

  async function recomputeBonus() {
    if (!selectedMonth) return;
    await api.post(`/costs/recompute-bonus/${selectedMonth.id}`);
    await refresh();
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Costs"
        subtitle={selectedMonth.label}
        actions={
          <Button variant="secondary" size="sm" onClick={recomputeBonus}>
            Recompute Bonus line
          </Button>
        }
      />

      <Card className="p-5">
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. ISP Bill"
              required
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32"
              required
            />
          </Field>
          <Button type="submit" loading={busy}>
            Add Cost
          </Button>
        </form>
        {error && <p className="text-sm text-critical mt-3">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Label</Th>
              <Th className="text-right">Amount</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <Td>
                  {c.label} {c.isComputedBonus && <span className="text-xs text-ink-muted">(auto)</span>}
                </Td>
                <Td className="text-right tabular">{money(c.amount)}</Td>
                <Td className="text-right">
                  {!c.isComputedBonus && (
                    <button className="text-critical hover:underline text-xs" onClick={() => remove(c.id)}>
                      Delete
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            <tr className="font-semibold bg-page">
              <Td>Total Cost</Td>
              <Td className="text-right tabular">{money(totalCost)}</Td>
              <Td></Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
