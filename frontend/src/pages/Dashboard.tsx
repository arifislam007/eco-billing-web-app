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
import type { DashboardData } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money, pct } from "../format";
import { Card, EmptyState, LoadingState, PageHeader, StatTile, Table, Td, Th, Thead, vizHues } from "../components/ui";

export default function Dashboard() {
  const { selectedMonth } = useMonth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    api
      .get<DashboardData>(`/dashboard/${selectedMonth.id}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Create a month to get started." />;
  if (loading || !data) return <LoadingState />;

  const { totals, costs, profit, ledgerBalance } = data;
  const profitTone = Number(profit) < 0 ? "critical" : "good";
  const ledgerTone = Number(ledgerBalance) < 0 ? "critical" : "neutral";

  return (
    <div className="space-y-8">
      <PageHeader title={`${selectedMonth.label} Dashboard`} subtitle="Monthly summary and roll-ups" />

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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatTile
          label="Profit (Business Amount − Total Cost)"
          value={money(profit)}
          tone={profitTone}
        />
        <StatTile
          label="Ledger Balance (Σ receive − Σ send)"
          value={money(ledgerBalance)}
          tone={ledgerTone}
        />
      </section>
    </div>
  );
}
