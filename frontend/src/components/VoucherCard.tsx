import { Wifi } from "lucide-react";
import type { VoucherData } from "../api/types";
import { money, pct } from "../format";

export default function VoucherCard({ data }: { data: VoucherData }) {
  const { month, partner, entry, generatedAt } = data;

  return (
    <div className="voucher-page bg-surface border border-border rounded-xl p-8 max-w-xl mx-auto shadow-sm">
      <div className="text-center border-b border-border pb-4 mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Wifi size={14} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Econet</h2>
        </div>
        <p className="text-sm text-ink-secondary">Monthly Voucher — {month.label}</p>
        <p className="text-xs text-ink-muted">Generated: {new Date(generatedAt).toLocaleString()}</p>
      </div>

      <h3 className="text-lg font-semibold text-ink mb-4">{partner.name}</h3>

      <table className="w-full text-sm">
        <tbody>
          <Row label="Total Users" bn="মোট ইউজার" value={entry.totalUsers.toLocaleString()} />
          <Row label="Total Collection" bn="মোট বিল সংগ্রহ" value={money(entry.totalCollection)} />
          <Row label="Commission %" bn="কমিশন" value={pct(entry.commissionPct)} />
          <Row label="Commission Amount" bn="কমিশন পরিমান" value={money(entry.commissionAmount)} />
          <Row label="Business/Bill Amount" bn="বিলের পরিমান" value={money(entry.businessAmount)} />
          <Row label="Total Deposit" bn="জমা" value={money(entry.totalDeposit)} />
          <Row label="Total Due" bn="মোট বাকি" value={money(entry.dueWithBonus)} highlight />
          <Row
            label={`Bonus (${pct(entry.bonusPct)})`}
            bn="বোনাস"
            value={money(entry.bonusAmount)}
          />
          <Row label="Last Month Due" bn="গত মাসের বাকি" value={money(entry.lastMonthDue)} />
          <Row
            label="Due after bonus / Net payable"
            bn="বোনাস বাদে মোট বাকি"
            value={money(entry.dueAfterBonus)}
            highlight
            large
          />
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  bn,
  value,
  highlight,
  large,
}: {
  label: string;
  bn: string;
  value: string;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <tr className={`border-t border-border ${highlight ? "bg-accent-soft/50" : ""}`}>
      <td className={`py-2.5 pr-2 text-ink ${large ? "font-semibold" : ""}`}>
        {label} <span className="text-ink-muted text-xs">({bn})</span>
      </td>
      <td className={`py-2.5 text-right tabular text-ink ${large ? "font-semibold text-lg" : ""}`}>
        {value}
      </td>
    </tr>
  );
}
