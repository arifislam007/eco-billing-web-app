import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ChevronLeft, ChevronRight, Download, FileText, ImageDown, Printer } from "lucide-react";
import { api } from "../api/client";
import type { Partner, PartnerMonthEntry, VoucherData } from "../api/types";
import { useMonth } from "../context/MonthContext";
import VoucherCard from "../components/VoucherCard";
import { Button, Card, EmptyState, IconButton, LoadingState, Menu, PageHeader, SegmentedControl, Select } from "../components/ui";
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

  function fileBase() {
    if (!selectedMonth) return "voucher";
    return mode === "single" && voucher
      ? `voucher-${slug(voucher.partner.name)}-${slug(selectedMonth.label)}`
      : `vouchers-${slug(selectedMonth.label)}`;
  }

  async function exportAsImage() {
    if (!printAreaRef.current || !selectedMonth) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(printAreaRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileBase()}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportAsPdf() {
    if (!printAreaRef.current || !selectedMonth) return;
    setExporting(true);
    try {
      await exportElementAsPdf(printAreaRef.current, `${fileBase()}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  if (!selectedMonth) return <EmptyState title="No month selected" hint="Select a month from the header first." />;
  if (!partners.length)
    return (
      <div>
        <PageHeader eyebrow={selectedMonth.label} title="Vouchers" />
        <EmptyState icon={FileText} title="No vouchers yet" hint="Vouchers appear once partners have Monthly Entry rows for this month." />
      </div>
    );

  const idx = partners.findIndex((p) => p.id === partnerId);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={selectedMonth.label}
        title="Vouchers"
        subtitle="One voucher per partner — print it, or save it as an image or PDF to share."
        actions={
          <SegmentedControl
            value={mode}
            onChange={setMode}
            className="no-print"
            options={[
              { value: "single", label: "One partner" },
              { value: "all", label: `All (${partners.length})` },
            ]}
          />
        }
      />

      <Card className="no-print p-3 flex flex-wrap items-center gap-2 sticky top-[4.5rem] lg:top-20 z-10">
        {mode === "single" ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <IconButton label="Previous partner" onClick={() => step(-1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="flex-1 sm:flex-none sm:w-56" aria-label="Partner">
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <IconButton label="Next partner" onClick={() => step(1)}>
              <ChevronRight size={18} />
            </IconButton>
            <span className="hidden sm:inline text-xs text-ink-muted ml-1 tabular">
              {idx + 1} of {partners.length}
            </span>
          </div>
        ) : (
          <p className="flex-1 text-sm text-ink-secondary px-1">
            All {partners.length} vouchers, one per page when printed.
          </p>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Menu
            label={exporting ? "Saving..." : "Save as"}
            icon={Download}
            items={[
              { label: "Image (PNG)", icon: ImageDown, onClick: exportAsImage, disabled: exporting },
              { label: "PDF", icon: FileText, onClick: exportAsPdf, disabled: exporting },
            ]}
          />
          <Button onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
        </div>
      </Card>

      {mode === "single" && (
        <div className="print-area" ref={printAreaRef}>
          {voucher ? <VoucherCard data={voucher} /> : <LoadingState />}
        </div>
      )}

      {mode === "all" && (
        <div className="print-area space-y-8" ref={printAreaRef}>
          {allVouchers ? allVouchers.map((v) => <VoucherCard key={v.partner.id} data={v} />) : <LoadingState />}
        </div>
      )}
    </div>
  );
}
