import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, Wallet } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Transaction } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import {
  Banner,
  Button,
  Card,
  cx,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Panel,
  SegmentedControl,
  StatTile,
  useConfirm,
} from "../components/ui";
import { useToast } from "../components/Toast";

export default function Transactions() {
  const { selectedMonth } = useMonth();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState("0");
  const [details, setDetails] = useState("");
  // One amount box + a direction toggle; still posts the same send/receive pair.
  const [direction, setDirection] = useState<"receive" | "send">("receive");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!selectedMonth) return;
    const data = await api.get<{ transactions: Transaction[]; balance: string }>(`/transactions?monthId=${selectedMonth.id}`);
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
    const value = Number(amount) || 0;
    try {
      await api.post("/transactions", {
        monthId: selectedMonth.id,
        details,
        send: direction === "send" ? value : 0,
        receive: direction === "receive" ? value : 0,
        comment: comment || undefined,
      });
      toast(`${direction === "receive" ? "Received" : "Sent"} ${money(value)} recorded`);
      setDetails("");
      setAmount("");
      setComment("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add transaction");
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Transaction) {
    const ok = await confirm({
      title: "Delete this transaction?",
      message: `"${t.details}" will be removed and the running balance recalculated. This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await api.delete(`/transactions/${t.id}`);
      toast("Transaction deleted");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete transaction");
    }
  }

  if (!selectedMonth) return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const totalSent = transactions.reduce((s, t) => s + (Number(t.send) || 0), 0);
  const totalReceived = transactions.reduce((s, t) => s + (Number(t.receive) || 0), 0);

  return (
    <div className="space-y-6">
      {confirmUi}
      <PageHeader eyebrow={selectedMonth.label} title="bKash ledger" subtitle="Money sent and received through bKash, with a running balance." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatTile
          label="Balance"
          value={money(balance)}
          tone={Number(balance) < 0 ? "critical" : "neutral"}
          icon={Wallet}
          hue="var(--color-accent)"
        />
        <StatTile label="Received" value={money(totalReceived)} icon={ArrowDownLeft} hue="var(--color-good)" />
        <StatTile label="Sent" value={money(totalSent)} icon={ArrowUpRight} hue="var(--color-critical)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Panel title="Add a transaction" className="lg:sticky lg:top-24">
          <form onSubmit={onAdd} className="space-y-3">
            <SegmentedControl
              value={direction}
              onChange={setDirection}
              className="w-full [&>button]:flex-1"
              options={[
                { value: "receive", label: "Money in" },
                { value: "send", label: "Money out" },
              ]}
            />
            <Field label="Details">
              <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Received from Jahid" required />
            </Field>
            <Field label={direction === "receive" ? "Amount received (Tk)" : "Amount sent (Tk)"}>
              <Input type="number" inputMode="numeric" min={0} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            <Field label="Comment (optional)">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
            {error && <Banner tone="critical">{error}</Banner>}
            <Button type="submit" loading={busy} className="w-full">
              {!busy && <Plus size={15} />} Add transaction
            </Button>
          </form>
        </Panel>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Ledger</h3>
            <span className="text-xs text-ink-muted">{transactions.length} entries</span>
          </div>
          <DataTable<Transaction>
            rows={transactions}
            rowKey={(t) => t.id}
            empty="No transactions recorded this month."
            columns={[
              { key: "details", header: "Details", primary: true, cell: (t) => <span className="font-medium">{t.details}</span> },
              { key: "date", header: "Date", cell: (t) => <span className="text-ink-secondary">{new Date(t.date).toLocaleDateString()}</span> },
              {
                key: "send",
                header: "Sent",
                align: "right",
                cell: (t) => (Number(t.send) ? <span className="text-critical">−{money(t.send)}</span> : <span className="text-ink-muted">—</span>),
              },
              {
                key: "receive",
                header: "Received",
                align: "right",
                cell: (t) => (Number(t.receive) ? <span className="text-good">+{money(t.receive)}</span> : <span className="text-ink-muted">—</span>),
              },
              {
                key: "balance",
                header: "Balance",
                align: "right",
                cell: (t) => (
                  <span className={cx("font-semibold", Number(t.runningBalance ?? 0) < 0 && "text-critical")}>{money(t.runningBalance ?? 0)}</span>
                ),
              },
              { key: "comment", header: "Comment", hideOnMobile: !transactions.some((t) => t.comment), cell: (t) => <span className="text-ink-secondary">{t.comment ?? "—"}</span> },
            ]}
            actions={(t) => (
              <IconButton label="Delete transaction" onClick={() => remove(t)} className="hover:text-critical hover:bg-critical-soft">
                <Trash2 size={16} />
              </IconButton>
            )}
            footer={[
              { key: "details", value: "Totals" },
              { key: "send", value: money(totalSent) },
              { key: "receive", value: money(totalReceived) },
              { key: "balance", value: money(balance) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
