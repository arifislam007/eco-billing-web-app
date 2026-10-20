import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Wallet,
  Percent,
  Landmark,
  PiggyBank,
  ReceiptText,
  CircleDollarSign,
  TrendingUp,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { api } from "../api/client";
import type { CostItem, DashboardData, DashboardTrends, PartnerMonthEntry } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money, pct } from "../format";
import { CostSummary } from "../components/CostSummary";
import { categorizeCost, costCategory } from "../lib/costCategories";
import {
  Badge,
  BarChart,
  BarList,
  Button,
  Card,
  cx,
  DataTable,
  EmptyState,
  LineChart,
  LoadingState,
  PageHeader,
  Panel,
  SectionTitle,
  Select,
  StatTile,
  vizHues,
} from "../components/ui";

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
    return (
      <EmptyState
        title="No month yet"
        hint="Create your first accounting month to start recording collections."
        action={
          <Link to="/months">
            <Button>
              <Plus size={15} /> Create a month
            </Button>
          </Link>
        }
      />
    );
  if (loading || !data) return <LoadingState />;

  const { totals, costs, profit, ledgerBalance } = data;
  const profitNegative = Number(profit) < 0;
  const ledgerNegative = Number(ledgerBalance) < 0;

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
  const partnerUserGrowth = selectedPartnerTrend?.series.map((s) => ({ label: s.label, value: s.totalUsers })) ?? [];
  const partnerRevenueGrowth =
    selectedPartnerTrend?.series.map((s) => ({ label: s.label, value: Number(s.totalCollection) || 0 })) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={selectedMonth.label}
        title="Dashboard"
        subtitle="How this month is going across all partners."
        actions={
          <>
            <Link to="/reports">
              <Button variant="secondary">Monthly report</Button>
            </Link>
            <Link to="/entries">
              <Button>
                <Plus size={15} /> Add entry
              </Button>
            </Link>
          </>
        }
      />

      {/* Headline numbers */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HeroStat
          label="Profit"
          hint="Business amount minus total cost"
          value={money(profit)}
          tone={profitNegative ? "critical" : "good"}
        />
        <HeroStat label="Total collection" hint={`${totals.totalUsers.toLocaleString()} users`} value={money(totals.totalCollection)} />
        <HeroStat label="Due after bonus" hint="Still to collect from partners" value={money(totals.totalDueAfterBonus)} />
        <HeroStat
          label="bKash ledger balance"
          hint="Received minus sent"
          value={money(ledgerBalance)}
          tone={ledgerNegative ? "critical" : undefined}
          to="/transactions"
        />
      </section>

      <section>
        <SectionTitle>Totals across partners</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile label="Total users" value={totals.totalUsers.toLocaleString()} icon={Users} hue={vizHues[0]} />
          <StatTile label="Total collection" value={money(totals.totalCollection)} icon={Wallet} hue={vizHues[1]} />
          <StatTile label="Total commission" value={money(totals.totalCommission)} icon={Percent} hue={vizHues[2]} />
          <StatTile label="Business amount" value={money(totals.totalBusinessAmount)} icon={Landmark} hue={vizHues[3]} />
          <StatTile label="Total deposits" value={money(totals.totalDeposits)} icon={PiggyBank} hue={vizHues[4]} />
          <StatTile label="Due (with bonus)" value={money(totals.totalDueWithBonus)} icon={ReceiptText} hue={vizHues[5]} />
          <StatTile label="Due (after bonus)" value={money(totals.totalDueAfterBonus)} icon={CircleDollarSign} hue={vizHues[6]} />
          <StatTile
            label="Avg commission / bonus"
            value={`${pct(Number(totals.avgCommissionPct) / 100)} / ${pct(Number(totals.avgBonusPct) / 100)}`}
            icon={TrendingUp}
            hue={vizHues[7]}
          />
        </div>
      </section>

      <section>
        <SectionTitle>User performance</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Total users by month">
            <BarChart data={userGrowth} formatValue={(v) => v.toLocaleString()} hue={vizHues[0]} />
          </Panel>
          <Panel title="Users by partner" description={selectedMonth.label}>
            <BarList data={usersByPartner} formatValue={(v) => v.toLocaleString()} hue={vizHues[0]} />
          </Panel>
        </div>
      </section>

      <section>
        <SectionTitle>Revenue & cost</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Revenue by partner" description={selectedMonth.label}>
            <BarList data={revenueByPartner} formatValue={(v) => money(v)} hue={vizHues[1]} />
          </Panel>
          <Panel title="Revenue growth">
            <LineChart data={revenueGrowth} formatValue={(v) => money(v)} hue={vizHues[1]} />
          </Panel>
          <Panel title="Cost growth">
            <LineChart data={costGrowth} formatValue={(v) => money(v)} hue={vizHues[6]} />
          </Panel>
        </div>
      </section>

      <section>
        <SectionTitle
          actions={
            trends.byPartner.length > 0 && (
              <div className="w-48">
              <Select aria-label="Partner" value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)}>
                {trends.byPartner.map((p) => (
                  <option key={p.partnerId} value={p.partnerId}>
                    {p.partnerName}
                  </option>
                ))}
              </Select>
              </div>
            )
          }
        >
          Partner growth
        </SectionTitle>
        {trends.byPartner.length === 0 ? (
          <EmptyState title="No partners yet" hint="Add a partner to see their growth over time." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Users by month">
              <BarChart data={partnerUserGrowth} formatValue={(v) => v.toLocaleString()} hue={vizHues[0]} />
            </Panel>
            <Panel title="Revenue growth">
              <LineChart data={partnerRevenueGrowth} formatValue={(v) => money(v)} hue={vizHues[1]} />
            </Panel>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionTitle
          actions={
            <Link to="/costs" className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-1">
              Manage costs <ArrowUpRight size={14} />
            </Link>
          }
        >
          Costs
        </SectionTitle>
        <CostSummary items={costs.items} totalCost={costs.totalCost} />
        <Card className="overflow-hidden">
          <DataTable<CostItem>
            rows={costs.items}
            rowKey={(c) => c.id}
            empty="No costs recorded this month."
            columns={[
              {
                key: "label",
                header: "Label",
                primary: true,
                cell: (c) => (
                  <span>
                    {c.label} {c.isComputedBonus && <span className="text-xs text-ink-muted">(auto)</span>}
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
            footer={[
              { key: "label", value: "Total cost" },
              { key: "amount", value: money(costs.totalCost) },
            ]}
          />
        </Card>
      </section>
    </div>
  );
}

function HeroStat({
  label,
  hint,
  value,
  tone,
  to,
}: {
  label: string;
  hint: string;
  value: string;
  tone?: "good" | "critical";
  to?: string;
}) {
  const body = (
    <Card hover className="p-5 h-full relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: tone === "good" ? "var(--color-good)" : tone === "critical" ? "var(--color-critical)" : "var(--color-accent)",
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-secondary">{label}</p>
        {to && <ArrowUpRight size={16} className="text-ink-muted" />}
      </div>
      <p
        className={cx(
          "text-2xl sm:text-3xl font-semibold tabular tracking-tight mt-2",
          tone === "good" ? "text-good" : tone === "critical" ? "text-critical" : "text-ink"
        )}
      >
        {value}
      </p>
      <p className="text-xs text-ink-muted mt-1">{hint}</p>
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  );
}
