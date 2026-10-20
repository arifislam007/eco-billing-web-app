import type { CostItem, Deposit } from "../api/types";
import { money } from "../format";
import { summarizeCosts } from "../lib/costCategories";
import { Card, vizHues } from "./ui";

export interface BreakdownRow {
  key: string;
  label: string;
  hue: string;
  amount: number;
  count: number;
}

/**
 * Share-of-total summary card: a total, a stacked strip showing each row's
 * share, then one tile per row with amount, share and item count.
 */
export function BreakdownSummary({
  title,
  rows,
  total,
  emptyHint,
}: {
  title: string;
  rows: BreakdownRow[];
  total: number;
  emptyHint?: string;
}) {
  const share = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="text-sm text-ink-muted">
          Total <span className="text-lg font-semibold text-ink tabular ml-1">{money(total)}</span>
        </p>
      </div>

      <div
        className="flex h-2.5 rounded-full overflow-hidden mb-5 gap-0.5"
        style={{ background: "var(--color-page)" }}
        role="img"
        aria-label={`${title}: share of total`}
      >
        {total > 0 &&
          rows
            .filter((r) => r.amount > 0)
            .map((r) => (
              <div key={r.key} style={{ width: `${(r.amount / total) * 100}%`, background: r.hue }} title={`${r.label}: ${money(r.amount)}`} />
            ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-4">{emptyHint ?? "Nothing to summarize yet."}</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {rows.map((r) => (
            <div key={r.key} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.hue }} />
                <span className="text-xs font-medium text-ink-muted uppercase tracking-wide truncate" title={r.label}>
                  {r.label}
                </span>
              </div>
              <div className="text-lg font-semibold tabular text-ink">{money(r.amount)}</div>
              <div className="text-xs text-ink-muted mt-0.5 tabular">
                {share(r.amount)}% · {r.count} {r.count === 1 ? "item" : "items"}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Cost summary by category (ISP Bill, Office Management, Salary, Personal Cost, plus Bonus/Other when present). */
export function CostSummary({ items, totalCost }: { items: CostItem[]; totalCost: string | number }) {
  return <BreakdownSummary title="Cost summary" rows={summarizeCosts(items)} total={Number(totalCost) || 0} />;
}

/** Deposit summary by partner - every active partner gets a tile, even at zero, so missing deposits stand out. */
export function DepositSummary({
  deposits,
  partners,
}: {
  deposits: Deposit[];
  partners: Array<{ id: string; name: string }>;
}) {
  const rows: BreakdownRow[] = partners.map((p, i) => ({
    key: p.id,
    label: p.name,
    hue: vizHues[i % vizHues.length],
    amount: 0,
    count: 0,
  }));
  for (const d of deposits) {
    let row = rows.find((r) => r.key === d.partnerId);
    if (!row) {
      // Deposit from a partner no longer in the active list - still counted.
      row = { key: d.partnerId, label: d.partner?.name ?? "Unknown partner", hue: vizHues[rows.length % vizHues.length], amount: 0, count: 0 };
      rows.push(row);
    }
    row.amount += Number(d.amount) || 0;
    row.count += 1;
  }
  rows.sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return <BreakdownSummary title="Deposit summary by partner" rows={rows} total={total} emptyHint="No active partners yet." />;
}
