import type { CostItem } from "../api/types";

// Cost items are free-text labels in the database. This groups them into
// summary buckets by label keywords - display only, nothing is written back,
// so existing data is untouched.
export type CostCategoryKey = "isp" | "office" | "salary" | "personal" | "bonus" | "other";

// Display order.
export const COST_CATEGORIES: Array<{ key: CostCategoryKey; label: string; hue: string; match?: RegExp }> = [
  { key: "isp", label: "ISP Bill", hue: "var(--color-viz-1)", match: /\bisp\b|bandwidth|internet|upstream|iig|nttn|btcl/i },
  { key: "office", label: "Office Management", hue: "var(--color-viz-4)", match: /office|rent|electric|utilit|maintenance|management|stationer|অফিস/i },
  { key: "salary", label: "Salary", hue: "var(--color-viz-2)", match: /salar|wage|payroll|বেতন/i },
  { key: "personal", label: "Personal Cost", hue: "var(--color-viz-6)", match: /personal|owner|withdraw|ব্যক্তিগত/i },
  { key: "bonus", label: "Bonus (auto)", hue: "var(--color-viz-3)" },
  { key: "other", label: "Other", hue: "var(--color-ink-muted)" },
];

// Match order: first hit wins (e.g. "Office staff salary" counts as Salary).
const MATCH_ORDER: CostCategoryKey[] = ["isp", "salary", "personal", "office"];

// The four buckets always shown even when empty; bonus/other appear only if non-zero.
const ALWAYS_SHOWN: CostCategoryKey[] = ["isp", "office", "salary", "personal"];

export function categorizeCost(item: Pick<CostItem, "label" | "isComputedBonus">): CostCategoryKey {
  if (item.isComputedBonus) return "bonus";
  const hit = MATCH_ORDER.find((k) => costCategory(k).match?.test(item.label));
  return hit ?? "other";
}

export function costCategory(key: CostCategoryKey) {
  return COST_CATEGORIES.find((c) => c.key === key)!;
}

export interface CostSummaryRow {
  key: CostCategoryKey;
  label: string;
  hue: string;
  amount: number;
  count: number;
}

export function summarizeCosts(items: CostItem[]): CostSummaryRow[] {
  const rows = COST_CATEGORIES.map((c) => ({ key: c.key, label: c.label, hue: c.hue, amount: 0, count: 0 }));
  for (const item of items) {
    const row = rows.find((r) => r.key === categorizeCost(item))!;
    row.amount += Number(item.amount) || 0;
    row.count += 1;
  }
  return rows.filter((r) => ALWAYS_SHOWN.includes(r.key) || r.count > 0);
}
