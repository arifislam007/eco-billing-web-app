import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Month } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Table, Td, Th, Thead } from "../components/ui";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Months() {
  const { months, selectedMonth, setSelectedMonthId, refreshMonths } = useMonth();
  const [monthNum, setMonthNum] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [carryForward, setCarryForward] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const label = `${MONTH_NAMES[monthNum - 1]}-${String(year).slice(2)}`;
      const created = await api.post<Month>("/months", {
        label,
        year,
        month: monthNum,
        carryForwardFrom: carryForward ? selectedMonth?.id : undefined,
      });
      await refreshMonths();
      setSelectedMonthId(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create month");
    } finally {
      setBusy(false);
    }
  }

  async function closeMonth(id: string) {
    await api.patch(`/months/${id}`, { status: "closed" });
    await refreshMonths();
  }

  async function reopenMonth(id: string) {
    await api.patch(`/months/${id}`, { status: "open" });
    await refreshMonths();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Months" subtitle="Create, select, and close accounting periods" />

      <Card className="p-5 max-w-md">
        <h2 className="font-medium text-ink mb-4">Create a new month</h2>
        <form onSubmit={onCreate} className="space-y-4">
          <div className="flex gap-3">
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
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
              />
            </Field>
          </div>
          {selectedMonth && (
            <label className="flex items-start gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={carryForward}
                onChange={(e) => setCarryForward(e.target.checked)}
                className="mt-0.5"
              />
              Carry forward due-after-bonus from {selectedMonth.label} as next month's Last Month Due
            </label>
          )}
          {error && <p className="text-sm text-critical">{error}</p>}
          <Button type="submit" loading={busy}>
            Create Month
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <tr>
              <Th>Label</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.id} className={m.id === selectedMonth?.id ? "bg-accent-soft/40" : undefined}>
                <Td className="font-medium">{m.label}</Td>
                <Td>
                  <Badge tone={m.status === "open" ? "good" : "neutral"}>{m.status}</Badge>
                </Td>
                <Td className="text-right space-x-3">
                  <button
                    className="text-accent hover:underline text-sm"
                    onClick={() => setSelectedMonthId(m.id)}
                  >
                    Select
                  </button>
                  {m.status === "open" ? (
                    <button
                      className="text-warning hover:underline text-sm"
                      onClick={() => closeMonth(m.id)}
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      className="text-good hover:underline text-sm"
                      onClick={() => reopenMonth(m.id)}
                    >
                      Reopen
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
