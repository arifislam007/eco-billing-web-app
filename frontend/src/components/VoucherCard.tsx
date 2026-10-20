import type { VoucherData } from "../api/types";
import { money, pct } from "../format";
import logo from "../assets/eco-logo.jpg";

export default function VoucherCard({ data }: { data: VoucherData }) {
  const { month, partner, entry, generatedAt } = data;

  return (
    <div className="paper voucher-page border border-border rounded-2xl max-w-xl mx-auto shadow-[var(--shadow-md)] overflow-hidden">
      <div className="flex items-center gap-4 px-6 sm:px-8 pt-6 pb-5 border-b border-border">
        <img src={logo} alt="Econet" className="w-14 h-14 object-contain shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-ink leading-tight">Econet</h2>
          <p className="text-sm text-ink-secondary">Monthly Voucher · {month.label}</p>
        </div>
        <p className="text-[11px] text-ink-muted text-right hidden sm:block">
          Generated
          <br />
          {new Date(generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="px-6 sm:px-8 py-5">
        <p className="text-xs uppercase tracking-wider text-ink-muted">Partner</p>
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
            <Row label={`Bonus (${pct(entry.bonusPct)})`} bn="বোনাস" value={money(entry.bonusAmount)} />
            <Row label="Last Month Due" bn="গত মাসের বাকি" value={money(entry.lastMonthDue)} />
          </tbody>
        </table>

        <div className="mt-4 rounded-xl bg-accent-soft px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Net payable</p>
            <p className="text-xs text-ink-secondary">Due after bonus · বোনাস বাদে মোট বাকি</p>
          </div>
          <p className="text-2xl font-bold tabular text-accent">Tk {money(entry.dueAfterBonus)}</p>
        </div>
        <p className="sm:hidden text-[11px] text-ink-muted mt-3">Generated {new Date(generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

function Row({ label, bn, value, highlight }: { label: string; bn: string; value: string; highlight?: boolean }) {
  return (
    <tr className="border-t border-border first:border-t-0">
      <td className={`py-2.5 pr-2 ${highlight ? "font-semibold text-ink" : "text-ink-secondary"}`}>
        {label} <span className="text-ink-muted text-xs font-normal">({bn})</span>
      </td>
      <td className={`py-2.5 text-right tabular ${highlight ? "font-semibold text-ink" : "text-ink"}`}>{value}</td>
    </tr>
  );
}
