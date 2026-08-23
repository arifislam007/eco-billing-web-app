import { useEffect, useState } from "react";
import {
  Users,
  Wallet,
  Percent,
  Landmark,
  PiggyBank,
  ReceiptText,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";
import { api } from "../api/client";
import type { DashboardData, DashboardTrends, PartnerMonthEntry } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money, pct } from "../format";
import { BarList, Card, cx, EmptyState, LineChart, LoadingState, PageHeader, Select, StatTile, Table, Td, Th, Thead, vizHues } from "../components/ui";

export default function Dashboard() {
  const { selectedMonth } = useMonth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [entries, setEntries] = useState<PartnerMonthEntry[]>([]);
  const [trends, setTrends] = useState<DashboardTrends>({ overall: [], byPartner: [] });
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    Promise.all([
      api.get<DashboardData>(`/dashboard/${selectedMonth.id}`),
      api.get<PartnerMonthEntry[]>(`/entries?monthId=${selectedMonth.id}`),
    ])
      .then(([dashboard, entryList]) => {
        setData(dashboard);
        setEntries(entryList);
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  useEffect(() => {
    api.get<DashboardTrends>("/dashboard/trends").then((t) => {
      setTrends(t);
      if (!selectedPartnerId && t.byPartner.length) setSelectedPartnerId(t.byPartner[0].partnerId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Create a month to get started." />;
  if (loading || !data) return <LoadingState />;

  const { totals, costs, profit, ledgerBalance } = data;
  const profitTone = Number(profit) < 0 ? "critical" : "good";
  const ledgerTone = Number(ledgerBalance) < 0 ? "critical" : "neutral";

  const usersByPartner = [...entries]
    .map((e) => ({ label: e.partner?.name ?? "—", value: e.totalUsers }))
    .sort((a, b) => b.value - a.value);
  const revenueByPartner = [...entries]
    .map((e) => ({ label: e.partner?.name ?? "—", value: Number(e.totalCollection) || 0 }))
    .sort((a, b) => b.value - a.value);

  const userGrowth = trends.overall.map((t) => ({ label: t.label, value: t.totalUsers }));
  const revenueGrowth = trends.overall.map((t) => ({ label: t.label, value: Number(t.totalCollection) || 0 }));
  const costGrowth = trends.overall.map((t) => ({ label: t.label, value: Number(t.totalCost) || 0 }));

  const selectedPartnerTrend = trends.byPartner.find((p) => p.partnerId === selectedPartnerId);
  const partnerUserGrowth =
    selectedPartnerTrend?.series.map((s) => ({ label: s.label, value: s.totalUsers })) ?? [];
  const partnerRevenueGrowth =
    selectedPartnerTrend?.series.map((s) => ({ label: s.label, value: Number(s.totalCollection) || 0 })) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={`${selectedMonth.label} Dashboard`} subtitle="Monthly summary and roll-ups" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-1"
            style={{ background: profitTone === "good" ? "var(--color-good)" : "var(--color-critical)" }}
          />
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Profit — Business Amount minus Total Cost
          </p>
          <p className={cx("text-3xl font-bold tabular", profitTone === "good" ? "text-good" : "text-critical")}>
            {money(profit)}
          </p>
        </Card>
        <Card className="p-5 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-1"
            style={{ background: ledgerTone === "critical" ? "var(--color-critical)" : "var(--color-accent)" }}
          />
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Ledger Balance — bKash receive minus send
          </p>
          <p className={cx("text-3xl font-bold tabular", ledgerTone === "critical" ? "text-critical" : "text-ink")}>
            {money(ledgerBalance)}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
          Totals across partners
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Total Users"
            value={totals.totalUsers.toLocaleString()}
            icon={Users}
            hue={vizHues[0]}
          />
          <StatTile
            label="Total Collection"
            value={money(totals.totalCollection)}
            icon={Wallet}
            hue={vizHues[1]}
          />
          <StatTile
            label="Total Commission"
            value={money(totals.totalCommission)}
            icon={Percent}
            hue={vizHues[2]}
          />
          <StatTile
            label="Total Business Amount"
            value={money(totals.totalBusinessAmount)}
            icon={Landmark}
            hue={vizHues[3]}
          />
          <StatTile
            label="Total Deposits"
            value={money(totals.totalDeposits)}
            icon={PiggyBank}
            hue={vizHues[4]}
          />
          <StatTile
            label="Total Due (with bonus)"
            value={money(totals.totalDueWithBonus)}
            icon={ReceiptText}
            hue={vizHues[5]}
          />
          <StatTile
            label="Total Due (after bonus)"
            value={money(totals.totalDueAfterBonus)}
            icon={CircleDollarSign}
            hue={vizHues[6]}
          />
          <StatTile
            label="Avg Commission % / Bonus %"
            value={`${pct(Number(totals.avgCommissionPct) / 100)} / ${pct(
              Number(totals.avgBonusPct) / 100
            )}`}
            icon={TrendingUp}
            hue={vizHues[7]}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
          Partner analysis
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Users by partner</h3>
            <BarList
              data={usersByPartner}
              formatValue={(v) => v.toLocaleString()}
              hue={vizHues[0]}
            />
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Revenue by partner</h3>
            <BarList data={revenueByPartner} formatValue={(v) => money(v)} hue={vizHues[1]} />
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
          Growth over time
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-2">Total user growth</h3>
            <LineChart data={userGrowth} formatValue={(v) => v.toLocaleString()} hue={vizHues[0]} />
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-2">Total revenue growth</h3>
            <LineChart data={revenueGrowth} formatValue={(v) => money(v)} hue={vizHues[1]} />
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-2">Total cost growth</h3>
            <LineChart data={costGrowth} formatValue={(v) => money(v)} hue={vizHues[6]} />
          </Card>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
            Partner growth over time
          </h2>
          {trends.byPartner.length > 0 && (
            <Select value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)}>
              {trends.byPartner.map((p) => (
                <option key={p.partnerId} value={p.partnerId}>
                  {p.partnerName}
                </option>
              ))}
            </Select>
          )}
        </div>
        {trends.byPartner.length === 0 ? (
          <EmptyState title="No partners yet" hint="Add a partner to see their growth over time." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-2">User growth</h3>
              <LineChart data={partnerUserGrowth} formatValue={(v) => v.toLocaleString()} hue={vizHues[0]} />
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-2">Revenue growth</h3>
              <LineChart data={partnerRevenueGrowth} formatValue={(v) => money(v)} hue={vizHues[1]} />
            </Card>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Cost block</h2>
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Label</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </Thead>
            <tbody>
              {costs.items.map((c) => (
                <tr key={c.id}>
                  <Td>
                    {c.label}{" "}
                    {c.isComputedBonus && <span className="text-xs text-ink-muted">(auto)</span>}
                  </Td>
                  <Td className="text-right tabular">{money(c.amount)}</Td>
                </tr>
              ))}
              <tr className="font-semibold bg-page">
                <Td>Total Cost</Td>
                <Td className="text-right tabular">{money(costs.totalCost)}</Td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
