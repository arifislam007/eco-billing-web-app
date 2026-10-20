import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Deposit, Partner } from "../api/types";
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
  SegmentedControl,
  Select,
  useConfirm,
  vizHues,
} from "../components/ui";
import { DepositSummary } from "../components/CostSummary";
import { useToast } from "../components/Toast";

const MEDIUM_LABEL = { bkash: "bKash", cash: "Cash", bank: "Bank" } as const;

export default function Deposits() {
  const { selectedMonth } = useMonth();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
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

  function partnerName(d: Pick<Deposit, "partnerId" | "partner">) {
    return d.partner?.name ?? partners.find((p) => p.id === d.partnerId)?.name ?? "—";
  }

  // Same colour per partner as in the summary strip.
  function partnerHue(id: string) {
    const i = partners.findIndex((p) => p.id === id);
    return i >= 0 ? vizHues[i % vizHues.length] : "var(--color-ink-muted)";
  }

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
      toast(`Deposit of ${money(amount)} added for ${partners.find((p) => p.id === partnerId)?.name ?? "partner"}`);
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
    const ok = await confirm({
      title: "Delete this deposit?",
      message: `${money(d.amount)} from ${partnerName(d)} will be removed. This cannot be undone.`,
    });
    if (!ok) return;
    setError(null);
    try {
      await api.delete(`/deposits/${d.id}`);
      toast("Deposit deleted");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete deposit");
    }
  }

  if (!selectedMonth) return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const total = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader eyebrow={selectedMonth.label} title="Deposits" subtitle="Money received from partners this month." />

      <DepositSummary deposits={deposits} partners={partners} />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Panel title="Add a deposit" className="lg:sticky lg:top-24">
          {partners.length === 0 ? (
            <p className="text-sm text-ink-muted">Add an active partner first.</p>
          ) : (
            <form onSubmit={onAdd} className="space-y-3">
              <Field label="Partner">
                {partners.length <= 8 ? (
                  <div className="flex flex-wrap gap-2">
                    {partners.map((p) => (
                      <Chip key={p.id} active={partnerId === p.id} onClick={() => setPartnerId(p.id)} dot={partnerHue(p.id)}>
                        {p.name}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Amount (Tk)">
                <Input type="number" inputMode="numeric" min={1} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Paid by">
                <SegmentedControl
                  value={medium}
                  onChange={setMedium}
                  className="w-full [&>button]:flex-1"
                  options={[
                    { value: "bkash", label: "bKash" },
                    { value: "cash", label: "Cash" },
                    { value: "bank", label: "Bank" },
                  ]}
                />
              </Field>
              <Field label="Reference (optional)">
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction ID or note" />
              </Field>
              {error && <Banner tone="critical">{error}</Banner>}
              <Button type="submit" loading={busy} className="w-full">
                {!busy && <Plus size={15} />} Add deposit
              </Button>
            </form>
          )}
        </Panel>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">All deposits</h3>
            <span className="text-xs text-ink-muted">{deposits.length} deposits</span>
          </div>
          <DataTable<Deposit>
            rows={deposits}
            rowKey={(d) => d.id}
            empty="No deposits added for this month yet."
            columns={[
              {
                key: "partner",
                header: "Partner",
                primary: true,
                cell: (d) => <Badge dot={partnerHue(d.partnerId)}>{partnerName(d)}</Badge>,
              },
              { key: "date", header: "Date", cell: (d) => <span className="text-ink-secondary">{new Date(d.date).toLocaleDateString()}</span> },
              { key: "amount", header: "Amount", align: "right", cell: (d) => <span className="font-medium">{money(d.amount)}</span> },
              { key: "medium", header: "Medium", cell: (d) => <span className="text-ink-secondary">{MEDIUM_LABEL[d.medium]}</span> },
              { key: "ref", header: "Ref", cell: (d) => <span className="text-ink-secondary">{d.ref ?? "—"}</span> },
            ]}
            actions={(d) => (
              <IconButton label="Delete deposit" onClick={() => remove(d)} className="hover:text-critical hover:bg-critical-soft">
                <Trash2 size={16} />
              </IconButton>
            )}
            footer={[
              { key: "partner", value: "Total" },
              { key: "amount", value: money(total) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
