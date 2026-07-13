import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Partner, PartnerMonthEntry } from "../api/types";
import { useMonth } from "../context/MonthContext";
import { money, pct } from "../format";
import { Card, EmptyState, PageHeader } from "../components/ui";

type Draft = {
  totalUsers: string;
  totalCollection: string;
  commissionPct: string;
  bonusPct: string;
  discount: string;
  lastMonthDue: string;
};

function toDraft(e?: PartnerMonthEntry): Draft {
  return {
    totalUsers: e ? String(e.totalUsers) : "0",
    totalCollection: e ? e.totalCollection : "0",
    commissionPct: e ? e.commissionPct : "0.45",
    bonusPct: e ? e.bonusPct : "0",
    discount: e ? e.discount : "0",
    lastMonthDue: e ? e.lastMonthDue : "0",
  };
}

const cellInput =
  "border border-border rounded-md px-2 py-1 text-right text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

export default function Entries() {
  const { selectedMonth } = useMonth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [entries, setEntries] = useState<PartnerMonthEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!selectedMonth) return;
    const [p, e] = await Promise.all([
      api.get<Partner[]>("/partners?active=true"),
      api.get<PartnerMonthEntry[]>(`/entries?monthId=${selectedMonth.id}`),
    ]);
    setPartners(p);
    setEntries(e);
    const nextDrafts: Record<string, Draft> = {};
    for (const partner of p) {
      const existing = e.find((entry) => entry.partnerId === partner.id);
      nextDrafts[partner.id] = toDraft(existing);
    }
    setDrafts(nextDrafts);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth?.id]);

  function updateDraft(partnerId: string, field: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [partnerId]: { ...prev[partnerId], [field]: value } }));
  }

  function computePreview(d: Draft, partnerId: string) {
    const collection = Number(d.totalCollection) || 0;
    const commissionPct = Number(d.commissionPct) || 0;
    const bonusPct = Number(d.bonusPct) || 0;
    const discount = Number(d.discount) || 0;
    const lastMonthDue = Number(d.lastMonthDue) || 0;
    const existing = entries.find((e) => e.partnerId === partnerId);
    const totalDeposit = existing ? Number(existing.totalDeposit) : 0;

    const commissionAmount = collection * commissionPct;
    const businessAmount = collection - commissionAmount;
    const bonusAmount = businessAmount * bonusPct;
    const dueWithBonus = businessAmount - totalDeposit - discount + lastMonthDue;
    const dueAfterBonus = businessAmount - totalDeposit - bonusAmount - discount + lastMonthDue;

    return { commissionAmount, businessAmount, bonusAmount, dueWithBonus, dueAfterBonus, totalDeposit };
  }

  async function save(partnerId: string) {
    if (!selectedMonth) return;
    setError(null);
    setSavingId(partnerId);
    const d = drafts[partnerId];
    try {
      await api.post("/entries", {
        partnerId,
        monthId: selectedMonth.id,
        totalUsers: Number(d.totalUsers) || 0,
        totalCollection: Number(d.totalCollection) || 0,
        commissionPct: Number(d.commissionPct) || 0,
        bonusPct: Number(d.bonusPct) || 0,
        discount: Number(d.discount) || 0,
        lastMonthDue: Number(d.lastMonthDue) || 0,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save entry");
    } finally {
      setSavingId(null);
    }
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const totals = partners.reduce(
    (acc, p) => {
      const preview = computePreview(drafts[p.id] ?? toDraft(), p.id);
      acc.users += Number(drafts[p.id]?.totalUsers) || 0;
      acc.collection += Number(drafts[p.id]?.totalCollection) || 0;
      acc.commission += preview.commissionAmount;
      acc.business += preview.businessAmount;
      acc.deposit += preview.totalDeposit;
      acc.bonus += preview.bonusAmount;
      acc.dueWithBonus += preview.dueWithBonus;
      acc.dueAfterBonus += preview.dueAfterBonus;
      return acc;
    },
    { users: 0, collection: 0, commission: 0, business: 0, deposit: 0, bonus: 0, dueWithBonus: 0, dueAfterBonus: 0 }
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Monthly Entry — ${selectedMonth.label}`}
        subtitle="Edit input columns; computed columns update live. Click Save per row to persist."
      />

      {error && <p className="text-sm text-critical">{error}</p>}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-page text-ink-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium sticky left-0 bg-page">Partner</th>
              <th className="text-right px-3 py-2.5 font-medium">Users</th>
              <th className="text-right px-3 py-2.5 font-medium">Collection</th>
              <th className="text-right px-3 py-2.5 font-medium">Comm %</th>
              <th className="text-right px-3 py-2.5 font-medium">Bonus %</th>
              <th className="text-right px-3 py-2.5 font-medium">Discount</th>
              <th className="text-right px-3 py-2.5 font-medium">Last Mo. Due</th>
              <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Comm. Amt</th>
              <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Business Amt</th>
              <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Deposit</th>
              <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Bonus Amt</th>
              <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Due (w/ bonus)</th>
              <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Due (after bonus)</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => {
              const d = drafts[p.id];
              if (!d) return null;
              const preview = computePreview(d, p.id);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-1.5 font-medium sticky left-0 bg-surface">{p.name}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      className={`${cellInput} w-20`}
                      value={d.totalUsers}
                      onChange={(e) => updateDraft(p.id, "totalUsers", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      className={`${cellInput} w-28`}
                      value={d.totalCollection}
                      onChange={(e) => updateDraft(p.id, "totalCollection", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      className={`${cellInput} w-16`}
                      value={d.commissionPct}
                      onChange={(e) => updateDraft(p.id, "commissionPct", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      className={`${cellInput} w-16`}
                      value={d.bonusPct}
                      onChange={(e) => updateDraft(p.id, "bonusPct", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      className={`${cellInput} w-20`}
                      value={d.discount}
                      onChange={(e) => updateDraft(p.id, "discount", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      className={`${cellInput} w-24`}
                      value={d.lastMonthDue}
                      onChange={(e) => updateDraft(p.id, "lastMonthDue", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.commissionAmount)}</td>
                  <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.businessAmount)}</td>
                  <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.totalDeposit)}</td>
                  <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.bonusAmount)}</td>
                  <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.dueWithBonus)}</td>
                  <td className="px-3 py-1.5 text-right bg-page tabular font-semibold">
                    {money(preview.dueAfterBonus)}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => save(p.id)}
                      disabled={savingId === p.id}
                      className="text-accent hover:underline text-xs font-medium disabled:opacity-50"
                    >
                      {savingId === p.id ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold bg-page">
              <td className="px-3 py-2.5 sticky left-0 bg-page">Totals</td>
              <td className="px-3 py-2.5 text-right tabular">{totals.users.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.collection)}</td>
              <td colSpan={4}></td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.commission)}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.business)}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.deposit)}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.bonus)}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.dueWithBonus)}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totals.dueAfterBonus)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </Card>
      <p className="text-xs text-ink-muted">
        Commission % example: 0.45 = {pct(0.45)}. Deposit column reflects sums from the Deposits screen and
        is not directly editable here.
      </p>
    </div>
  );
}
