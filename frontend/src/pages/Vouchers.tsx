import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ChevronLeft, ChevronRight, Download, FileText, Printer } from "lucide-react";
import { api } from "../api/client";
import type { Partner, PartnerMonthEntry, VoucherData } from "../api/types";
import { useMonth } from "../context/MonthContext";
import VoucherCard from "../components/VoucherCard";
import { Button, EmptyState, PageHeader, Select } from "../components/ui";
import { exportElementAsPdf } from "../lib/exportPdf";

function slug(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Vouchers() {
  const { selectedMonth } = useMonth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [allVouchers, setAllVouchers] = useState<VoucherData[] | null>(null);
  const [mode, setMode] = useState<"single" | "all">("single");
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedMonth) return;
    Promise.all([
      api.get<Partner[]>("/partners?active=true"),
      api.get<PartnerMonthEntry[]>(`/entries?monthId=${selectedMonth.id}`),
    ]).then(([p, entries]) => {
      const withEntry = p.filter((partner) => entries.some((e) => e.partnerId === partner.id));
      setPartners(withEntry);
      if (withEntry.length && !partnerId) setPartnerId(withEntry[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth?.id]);

  useEffect(() => {
    if (!selectedMonth || !partnerId || mode !== "single") return;
    api.get<VoucherData>(`/vouchers/${selectedMonth.id}/${partnerId}`).then(setVoucher);
  }, [selectedMonth, partnerId, mode]);

  useEffect(() => {
    if (!selectedMonth || mode !== "all") return;
    api.get<VoucherData[]>(`/vouchers/${selectedMonth.id}`).then(setAllVouchers);
  }, [selectedMonth, mode]);

  function step(delta: number) {
    const idx = partners.findIndex((p) => p.id === partnerId);
    const next = partners[(idx + delta + partners.length) % partners.length];
    if (next) setPartnerId(next.id);
  }

  async function exportAsImage() {
    if (!printAreaRef.current || !selectedMonth) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(printAreaRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const name =
        mode === "single" && voucher
          ? `voucher-${slug(voucher.partner.name)}-${slug(selectedMonth.label)}.png`
          : `vouchers-${slug(selectedMonth.label)}.png`;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = name;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportAsPdf() {
    if (!printAreaRef.current || !selectedMonth) return;
    setExportingPdf(true);
    try {
      const name =
        mode === "single" && voucher
          ? `voucher-${slug(voucher.partner.name)}-${slug(selectedMonth.label)}.pdf`
          : `vouchers-${slug(selectedMonth.label)}.pdf`;
      await exportElementAsPdf(printAreaRef.current, name);
    } finally {
      setExportingPdf(false);
    }
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;
  if (!partners.length)
    return <EmptyState title="No entries yet" hint="Add Monthly Entry rows for this month first." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vouchers"
        subtitle={selectedMonth.label}
        actions={
          <div className="no-print flex items-center gap-1 bg-page border border-border rounded-lg p-1">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "single" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
              }`}
              onClick={() => setMode("single")}
            >
              Single
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "all" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
              }`}
              onClick={() => setMode("all")}
            >
              Print all
            </button>
          </div>
        }
      />

      {mode === "single" && (
        <>
          <div className="no-print flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => step(-1)}>
              <ChevronLeft size={15} /> Prev
            </Button>
            <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="sm" onClick={() => step(1)}>
              Next <ChevronRight size={15} />
            </Button>
            <Button className="ml-auto" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
            <Button variant="secondary" loading={exporting} onClick={exportAsImage}>
              <Download size={15} /> Export as Image
            </Button>
            <Button variant="secondary" loading={exportingPdf} onClick={exportAsPdf}>
              <FileText size={15} /> Export as PDF
            </Button>
          </div>
          <div className="print-area" ref={printAreaRef}>
            {voucher && <VoucherCard data={voucher} />}
          </div>
        </>
      )}

      {mode === "all" && (
        <>
          <div className="no-print flex items-center gap-3">
            <Button onClick={() => window.print()}>
              <Printer size={15} /> Print All
            </Button>
            <Button variant="secondary" loading={exporting} onClick={exportAsImage}>
              <Download size={15} /> Export as Image
            </Button>
            <Button variant="secondary" loading={exportingPdf} onClick={exportAsPdf}>
              <FileText size={15} /> Export as PDF
            </Button>
          </div>
          <div className="print-area space-y-8" ref={printAreaRef}>
            {allVouchers?.map((v) => (
              <VoucherCard key={v.partner.id} data={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
