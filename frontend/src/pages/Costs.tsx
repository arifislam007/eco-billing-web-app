import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { CostItem } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Table, Td, Th, Thead } from "../components/ui";
import { CostSummary } from "../components/CostSummary";
import { categorizeCost, costCategory } from "../lib/costCategories";

// One-click label presets so new items land in the right summary bucket.
const LABEL_PRESETS = ["ISP Bill", "Office Management", "Salary", "Personal Cost"];

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

  async function remove(item: CostItem) {
    if (!window.confirm(`Delete "${item.label}" (${money(item.amount)})? This cannot be undone.`)) return;
    const id = item.id;
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

      <CostSummary items={items} totalCost={totalCost} />

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-ink mb-3">Add a cost</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {LABEL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLabel(preset)}
              className={
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors " +
                (label === preset
                  ? "bg-accent-soft text-accent border-accent/40"
                  : "bg-surface text-ink-secondary border-border hover:bg-page")
              }
            >
              {preset}
            </button>
          ))}
        </div>
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. ISP Bill"
              className="w-56"
              required
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={0}
              step="1"
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
              <Th>Category</Th>
              <Th className="text-right">Amount</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <Td colSpan={4} className="text-center text-ink-muted py-8">
                  No costs added for this month yet.
                </Td>
              </tr>
            )}
            {items.map((c) => {
              const cat = costCategory(categorizeCost(c));
              return (
                <tr key={c.id}>
                  <Td>
                    {c.label} {c.isComputedBonus && <span className="text-xs text-ink-muted">(auto)</span>}
                  </Td>
                  <Td>
                    <Badge>
                      <span className="w-2 h-2 rounded-sm mr-1.5" style={{ background: cat.hue }} />
                      {cat.label}
                    </Badge>
                  </Td>
                  <Td className="text-right tabular">{money(c.amount)}</Td>
                  <Td className="text-right">
                    {!c.isComputedBonus && (
                      <Button variant="danger" size="sm" onClick={() => remove(c)}>
                        Delete
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
            <tr className="font-semibold bg-page">
              <Td>Total Cost</Td>
              <Td></Td>
              <Td className="text-right tabular">{money(totalCost)}</Td>
              <Td></Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
