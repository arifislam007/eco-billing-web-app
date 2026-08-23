import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { AppSettings, MonthlyReportRow } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useMonth } from "../context/MonthContext";
import { money } from "../format";
import { Button, Card, EmptyState, LoadingState, PageHeader, Switch } from "../components/ui";
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
    <div className="no-print flex items-center gap-3 mb-6">
      <Switch
        checked={settings?.allowStaffMonthlyReport ?? false}
        onChange={toggleStaffAccess}
        disabled={!settings || togglingAccess}
        label="Allow staff to view Monthly Report"
      />
    </div>
  );

  if (accessDenied) {
    return (
      <div className="space-y-6">
        <PageHeader title="Monthly Report" subtitle={selectedMonth.label} />
        <EmptyState
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
    const header = ["Partner", "Total Users", "Total Bill", "Billing Amount", "Total Deposit", "Due After Bonus"];
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((e) =>
        [
          e.partner?.name ?? "",
          e.totalUsers,
          Number(e.totalCollection) || 0,
          Number(e.businessAmount) || 0,
          Number(e.totalDeposit) || 0,
          Number(e.dueAfterBonus) || 0,
        ]
          .map(csvCell)
          .join(",")
      ),
      ["Total", totalUsers, totalBill, totalBillAmount, totalDeposit, totalDue].map(csvCell).join(","),
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
        title="Monthly Report"
        subtitle={selectedMonth.label}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Button onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
            <Button variant="secondary" loading={exporting} onClick={exportAsImage}>
              <Download size={15} /> Export as Image
            </Button>
            <Button variant="secondary" loading={exportingPdf} onClick={exportAsPdf}>
              <FileText size={15} /> Export as PDF
            </Button>
            <Button variant="secondary" onClick={exportAsCsv}>
              <FileSpreadsheet size={15} /> Export as CSV
            </Button>
          </div>
        }
      />

      {accessToggle}

      {!rows.length ? (
        <EmptyState title="No entries yet" hint="Add Monthly Entry rows for this month first." />
      ) : (
        <div className="print-area" ref={printAreaRef}>
          <Card className="p-8 max-w-3xl mx-auto">
            <div className="text-center border-b border-border pb-4 mb-4">
              <img src={logo} alt="Econet" className="w-14 h-14 object-contain mx-auto mb-1" />
              <h2 className="text-2xl font-bold text-ink">Econet</h2>
              <p className="text-sm text-ink-secondary">Monthly Report — {selectedMonth.label}</p>
              <p className="text-xs text-ink-muted">Generated: {new Date().toLocaleString()}</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted text-xs uppercase tracking-wide">
                  <th className="text-left py-2 font-medium">Partner</th>
                  <th className="text-right py-2 font-medium">Users</th>
                  <th className="text-right py-2 font-medium">Total Bill</th>
                  <th className="text-right py-2 font-medium">Billing Amount</th>
                  <th className="text-right py-2 font-medium">Total Deposit</th>
                  <th className="text-right py-2 font-medium">Due After Bonus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-2 font-medium text-ink">{e.partner?.name ?? "—"}</td>
                    <td className="py-2 text-right tabular text-ink">{e.totalUsers.toLocaleString()}</td>
                    <td className="py-2 text-right tabular text-ink">{money(e.totalCollection)}</td>
                    <td className="py-2 text-right tabular text-ink">{money(e.businessAmount ?? 0)}</td>
                    <td className="py-2 text-right tabular text-ink">{money(e.totalDeposit ?? 0)}</td>
                    <td className="py-2 text-right tabular text-ink">{money(e.dueAfterBonus ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold bg-accent-soft/50">
                  <td className="py-2.5 text-ink">Total</td>
                  <td className="py-2.5 text-right tabular text-ink">{totalUsers.toLocaleString()}</td>
                  <td className="py-2.5 text-right tabular text-ink">{money(totalBill)}</td>
                  <td className="py-2.5 text-right tabular text-ink">{money(totalBillAmount)}</td>
                  <td className="py-2.5 text-right tabular text-ink">{money(totalDeposit)}</td>
                  <td className="py-2.5 text-right tabular text-ink">{money(totalDue)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
