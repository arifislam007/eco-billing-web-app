import { useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { CostItem } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import {
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Panel,
  useConfirm,
} from "../components/ui";
import { CostSummary } from "../components/CostSummary";
import { useToast } from "../components/Toast";
import { categorizeCost, costCategory } from "../lib/costCategories";

// One-click label presets so new items land in the right summary bucket.
const LABEL_PRESETS = ["ISP Bill", "Office Management", "Salary", "Personal Cost"];

export default function Costs() {
  const { selectedMonth } = useMonth();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [items, setItems] = useState<CostItem[]>([]);
  const [totalCost, setTotalCost] = useState("0");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  async function refresh() {
    if (!selectedMonth) return;
    const data = await api.get<{ items: CostItem[]; totalCost: string }>(`/costs?monthId=${selectedMonth.id}`);
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
      toast(`Added ${label} · ${money(amount)}`);
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
    const ok = await confirm({
      title: "Delete this cost?",
      message: `"${item.label}" for ${money(item.amount)} will be removed. This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await api.delete(`/costs/${item.id}`);
      toast("Cost deleted");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete cost item");
    }
  }

  async function recomputeBonus() {
    if (!selectedMonth) return;
    setRecomputing(true);
    try {
      await api.post(`/costs/recompute-bonus/${selectedMonth.id}`);
      toast("Bonus line recomputed");
      await refresh();
    } finally {
      setRecomputing(false);
    }
  }

  if (!selectedMonth) return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader
        eyebrow={selectedMonth.label}
        title="Costs"
        subtitle="Business expenses for the month. The bonus line is calculated automatically."
        actions={
          <Button variant="secondary" loading={recomputing} onClick={recomputeBonus}>
            {!recomputing && <RefreshCw size={15} />} Recompute bonus
          </Button>
        }
      />

      <CostSummary items={items} totalCost={totalCost} />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Panel title="Add a cost" className="lg:sticky lg:top-24">
          <div className="flex flex-wrap gap-2 mb-4">
            {LABEL_PRESETS.map((preset) => (
              <Chip key={preset} active={label === preset} onClick={() => setLabel(preset)}>
                {preset}
              </Chip>
            ))}
          </div>
          <form onSubmit={onAdd} className="space-y-3">
            <Field label="Label">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. ISP Bill" required />
            </Field>
            <Field label="Amount (Tk)">
              <Input type="number" inputMode="numeric" min={0} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            {label && (
              <p className="text-xs text-ink-muted">
                Will be counted under{" "}
                <span className="font-medium text-ink">{costCategory(categorizeCost({ label, isComputedBonus: false })).label}</span>
              </p>
            )}
            {error && <Banner tone="critical">{error}</Banner>}
            <Button type="submit" loading={busy} className="w-full">
              {!busy && <Plus size={15} />} Add cost
            </Button>
          </form>
        </Panel>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Cost items</h3>
            <span className="text-xs text-ink-muted">{items.length} items</span>
          </div>
          <DataTable<CostItem>
            rows={items}
            rowKey={(c) => c.id}
            empty="No costs added for this month yet."
            columns={[
              {
                key: "label",
                header: "Label",
                primary: true,
                cell: (c) => (
                  <span className="font-medium">
                    {c.label} {c.isComputedBonus && <span className="text-xs font-normal text-ink-muted">(auto)</span>}
                  </span>
                ),
              },
              {
                key: "category",
                header: "Category",
                cell: (c) => {
                  const cat = costCategory(categorizeCost(c));
                  return <Badge dot={cat.hue}>{cat.label}</Badge>;
                },
              },
              { key: "amount", header: "Amount", align: "right", cell: (c) => money(c.amount) },
            ]}
            actions={(c) =>
              c.isComputedBonus ? null : (
                <IconButton label={`Delete ${c.label}`} onClick={() => remove(c)} className="hover:text-critical hover:bg-critical-soft">
                  <Trash2 size={16} />
                </IconButton>
              )
            }
            footer={[
              { key: "label", value: "Total cost" },
              { key: "amount", value: money(totalCost) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
