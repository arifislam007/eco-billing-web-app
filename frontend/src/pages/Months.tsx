import { useState, type FormEvent } from "react";
import { Check, Lock, LockOpen, Plus } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Month } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { Badge, Banner, Button, Card, DataTable, Field, Input, PageHeader, Panel, Select, useConfirm } from "../components/ui";
import { useToast } from "../components/Toast";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Months() {
  const { months, selectedMonth, setSelectedMonthId, refreshMonths } = useMonth();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [monthNum, setMonthNum] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [carryForward, setCarryForward] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const newLabel = `${MONTH_NAMES[monthNum - 1]}-${String(year).slice(2)}`;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.post<Month>("/months", {
        label: newLabel,
        year,
        month: monthNum,
        carryForwardFrom: carryForward ? selectedMonth?.id : undefined,
      });
      await refreshMonths();
      setSelectedMonthId(created.id);
      toast(`${newLabel} created and selected`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create month");
    } finally {
      setBusy(false);
    }
  }

  async function closeMonth(m: Month) {
    const ok = await confirm({
      title: `Close ${m.label}?`,
      message: "Closing marks the month as finished. You can reopen it later if something needs fixing.",
      confirmLabel: "Close month",
      tone: "primary",
    });
    if (!ok) return;
    await api.patch(`/months/${m.id}`, { status: "closed" });
    await refreshMonths();
    toast(`${m.label} closed`);
  }

  async function reopenMonth(m: Month) {
    await api.patch(`/months/${m.id}`, { status: "open" });
    await refreshMonths();
    toast(`${m.label} reopened`);
  }

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader title="Months" subtitle="Create, switch between and close accounting periods." />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Panel title="Create a new month" className="lg:sticky lg:top-24">
          <form onSubmit={onCreate} className="space-y-3">
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="Month">
                <Select value={monthNum} onChange={(e) => setMonthNum(Number(e.target.value))}>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Year">
                <Input type="number" inputMode="numeric" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </Field>
            </div>
            <p className="text-xs text-ink-muted">
              Will be named <span className="font-medium text-ink">{newLabel}</span>
            </p>
            {selectedMonth && (
              <label className="flex items-start gap-2.5 text-sm text-ink-secondary rounded-xl border border-border p-3 cursor-pointer hover:bg-page">
                <input
                  type="checkbox"
                  checked={carryForward}
                  onChange={(e) => setCarryForward(e.target.checked)}
                  className="mt-0.5 accent-[var(--color-accent)] w-4 h-4"
                />
                <span>
                  Carry forward each partner's due-after-bonus from <span className="font-medium text-ink">{selectedMonth.label}</span> as
                  the new month's Last Month Due
                </span>
              </label>
            )}
            {error && <Banner tone="critical">{error}</Banner>}
            <Button type="submit" loading={busy} className="w-full">
              {!busy && <Plus size={15} />} Create month
            </Button>
          </form>
        </Panel>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-[15px] font-semibold text-ink">All months</h3>
          </div>
          <DataTable<Month>
            rows={months}
            rowKey={(m) => m.id}
            empty="No months yet. Create the first one."
            rowClassName={(m) => (m.id === selectedMonth?.id ? "bg-accent-soft/50" : undefined)}
            columns={[
              {
                key: "label",
                header: "Month",
                primary: true,
                cell: (m) => (
                  <span className="font-medium inline-flex items-center gap-2">
                    {m.label}
                    {m.id === selectedMonth?.id && <Badge tone="accent">Selected</Badge>}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (m) => <Badge tone={m.status === "open" ? "good" : "neutral"}>{m.status === "open" ? "Open" : "Closed"}</Badge>,
              },
            ]}
            actions={(m) => (
              <div className="flex items-center gap-1.5">
                {m.id !== selectedMonth?.id && (
                  <Button size="sm" variant="secondary" onClick={() => setSelectedMonthId(m.id)}>
                    <Check size={14} /> Select
                  </Button>
                )}
                {m.status === "open" ? (
                  <Button size="sm" variant="ghost" onClick={() => closeMonth(m)}>
                    <Lock size={14} /> Close
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => reopenMonth(m)}>
                    <LockOpen size={14} /> Reopen
                  </Button>
                )}
              </div>
            )}
          />
        </Card>
      </div>
    </div>
  );
}
