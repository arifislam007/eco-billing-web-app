import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ClipboardList, Download, FileSpreadsheet, FileText, ImageDown, Lock, Printer } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { AppSettings, MonthlyReportRow } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Button, Card, EmptyState, LoadingState, Menu, PageHeader, Switch } from "../components/ui";
import { exportElementAsPdf } from "../lib/exportPdf";
import logo from "../assets/eco-logo.jpg";

function slug(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function MonthlyReport() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { selectedMonth } = useMonth();
  const [rows, setRows] = useState<MonthlyReportRow[] | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdmin) api.get<AppSettings>("/settings").then(setSettings);
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setAccessDenied(false);
    api
      .get<MonthlyReportRow[]>(`/reports/monthly?monthId=${selectedMonth.id}`)
      .then(setRows)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setAccessDenied(true);
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  async function toggleStaffAccess(next: boolean) {
    setTogglingAccess(true);
    try {
      const updated = await api.patch<AppSettings>("/settings", { allowStaffMonthlyReport: next });
      setSettings(updated);
    } finally {
      setTogglingAccess(false);
    }
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const accessToggle = isAdmin && (
    <Card className="no-print px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-ink">Staff access</p>
        <p className="text-xs text-ink-muted">Let staff accounts open this report.</p>
      </div>
      <Switch
        checked={settings?.allowStaffMonthlyReport ?? false}
        onChange={toggleStaffAccess}
        disabled={!settings || togglingAccess}
        label={settings?.allowStaffMonthlyReport ? "Allowed" : "Admins only"}
      />
    </Card>
  );

  if (accessDenied) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={selectedMonth.label} title="Monthly Report" />
        <EmptyState
          icon={Lock}
          title="Not available yet"
          hint="The Monthly Report isn't enabled for your account yet. Ask an admin to turn it on."
        />
      </div>
    );
  }

  if (loading || !rows) return <LoadingState />;

  const totalUsers = rows.reduce((sum, e) => sum + e.totalUsers, 0);
  const totalBill = rows.reduce((sum, e) => sum + (Number(e.totalCollection) || 0), 0);
  const totalBillAmount = rows.reduce((sum, e) => sum + (Number(e.businessAmount) || 0), 0);
  const totalBonus = rows.reduce((sum, e) => sum + (Number(e.bonusAmount) || 0), 0);
  const totalDeposit = rows.reduce((sum, e) => sum + (Number(e.totalDeposit) || 0), 0);
  const totalDue = rows.reduce((sum, e) => sum + (Number(e.dueAfterBonus) || 0), 0);

  async function exportAsImage() {
    if (!printAreaRef.current || !selectedMonth) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(printAreaRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `monthly-report-${slug(selectedMonth.label)}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportAsPdf() {
    if (!printAreaRef.current || !selectedMonth) return;
    setExportingPdf(true);
    try {
      await exportElementAsPdf(printAreaRef.current, `monthly-report-${slug(selectedMonth.label)}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  function exportAsCsv() {
    if (!selectedMonth || !rows) return;
    const header = [
      "Partner",
      "Total Users",
      "Total Bill",
      "Billing Amount",
      "Bonus Amount",
      "Total Deposit",
      "Due After Bonus",
    ];
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((e) =>
        [
          e.partner?.name ?? "",
          e.totalUsers,
          Number(e.totalCollection) || 0,
          Number(e.businessAmount) || 0,
          Number(e.bonusAmount) || 0,
          Number(e.totalDeposit) || 0,
          Number(e.dueAfterBonus) || 0,
        ]
          .map(csvCell)
          .join(",")
      ),
      ["Total", totalUsers, totalBill, totalBillAmount, totalBonus, totalDeposit, totalDue]
        .map(csvCell)
        .join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-report-${slug(selectedMonth.label)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selectedMonth.label}
        title="Monthly Report"
        subtitle="Partner-by-partner summary for the month, ready to print or share."
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Menu
              label={exporting || exportingPdf ? "Saving..." : "Export"}
              icon={Download}
              items={[
                { label: "Image (PNG)", icon: ImageDown, onClick: exportAsImage, disabled: exporting || !rows.length },
                { label: "PDF", icon: FileText, onClick: exportAsPdf, disabled: exportingPdf || !rows.length },
                { label: "Spreadsheet (CSV)", icon: FileSpreadsheet, onClick: exportAsCsv, disabled: !rows.length },
              ]}
            />
            <Button onClick={() => window.print()} disabled={!rows.length}>
              <Printer size={15} /> Print
            </Button>
          </div>
        }
      />

      {accessToggle}

      {!rows.length ? (
        <EmptyState icon={ClipboardList} title="No entries yet" hint="Add Monthly Entry rows for this month first." />
      ) : (
        <div className="print-area" ref={printAreaRef}>
          <div className="paper border border-border rounded-2xl p-5 sm:p-8 max-w-4xl mx-auto shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-4 border-b border-border pb-5 mb-4">
              <img src={logo} alt="Econet" className="w-14 h-14 object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-ink leading-tight">Econet</h2>
                <p className="text-sm text-ink-secondary">Monthly Report · {selectedMonth.label}</p>
              </div>
              <p className="text-[11px] text-ink-muted text-right">
                Generated
                <br />
                {new Date().toLocaleString()}
              </p>
            </div>

            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-ink-muted text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-semibold">Partner</th>
                  <th className="text-right py-2 pl-4 font-semibold">Users</th>
                  <th className="text-right py-2 pl-4 font-semibold">Total Bill</th>
                  <th className="text-right py-2 pl-4 font-semibold">Billing Amount</th>
                  <th className="text-right py-2 pl-4 font-semibold">Bonus Amount</th>
                  <th className="text-right py-2 pl-4 font-semibold">Total Deposit</th>
                  <th className="text-right py-2 pl-4 font-semibold">Due After Bonus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-2.5 pr-4 font-medium text-ink">{e.partner?.name ?? "—"}</td>
                    <td className="py-2.5 pl-4 text-right tabular text-ink">{e.totalUsers.toLocaleString()}</td>
                    <td className="py-2.5 pl-4 text-right tabular text-ink">{money(e.totalCollection)}</td>
                    <td className="py-2.5 pl-4 text-right tabular text-ink">{money(e.businessAmount ?? 0)}</td>
                    <td className="py-2.5 pl-4 text-right tabular text-ink">{money(e.bonusAmount ?? 0)}</td>
                    <td className="py-2.5 pl-4 text-right tabular text-ink">{money(e.totalDeposit ?? 0)}</td>
                    <td className="py-2.5 pl-4 text-right tabular text-ink">{money(e.dueAfterBonus ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/20 font-semibold bg-accent-soft">
                  <td className="py-3 px-2 text-ink">Total</td>
                  <td className="py-3 pl-4 text-right tabular text-ink">{totalUsers.toLocaleString()}</td>
                  <td className="py-3 pl-4 text-right tabular text-ink">{money(totalBill)}</td>
                  <td className="py-3 pl-4 text-right tabular text-ink">{money(totalBillAmount)}</td>
                  <td className="py-3 pl-4 text-right tabular text-ink">{money(totalBonus)}</td>
                  <td className="py-3 pl-4 text-right tabular text-ink">{money(totalDeposit)}</td>
                  <td className="py-3 pl-4 text-right tabular text-ink">{money(totalDue)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
