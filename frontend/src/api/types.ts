export interface Partner {
  id: string;
  name: string;
  active: boolean;
  phone: string | null;
  notes: string | null;
}

export interface Month {
  id: string;
  label: string;
  year: number;
  month: number;
  status: "open" | "closed";
}

// A "staff" role session only ever gets totalUsers/totalCollection back from
// the API (see backend/src/routes/entries.ts restrictForStaff) - everything
// else is optional here to reflect that honestly.
export interface PartnerMonthEntry {
  id: string;
  partnerId: string;
  monthId: string;
  totalUsers: number;
  totalCollection: string;
  partner?: Partner;
  commissionPct?: string;
  bonusPct?: string;
  discount?: string;
  lastMonthDue?: string;
  // computed
  depositBy15th?: string;
  totalDeposit?: string;
  commissionAmount?: string;
  businessAmount?: string;
  bonusAmount?: string;
  dueWithBonus?: string;
  dueAfterBonus?: string;
}

// One submission toward a partner's monthly total. Anyone can POST a new
// one (staff's "input multiple times"); only admin can PATCH/DELETE an
// existing row (a correction).
export interface CollectionEntry {
  id: string;
  partnerId: string;
  monthId: string;
  users: number;
  collection: string;
  note: string | null;
  createdAt: string;
  createdByUserId: string | null;
  createdBy?: { email: string } | null;
}

export interface Deposit {
  id: string;
  partnerId: string;
  monthId: string;
  date: string;
  amount: string;
  medium: "cash" | "bkash" | "bank";
  ref: string | null;
  partner?: Partner;
}

export interface CostItem {
  id: string;
  monthId: string;
  label: string;
  amount: string;
  note: string | null;
  isComputedBonus: boolean;
}

export interface Transaction {
  id: string;
  monthId: string | null;
  date: string;
  details: string;
  send: string;
  receive: string;
  comment: string | null;
  runningBalance?: string;
}

export interface MonthTrendPoint {
  monthId: string;
  label: string;
  totalUsers: number;
  totalCollection: string;
  totalCost: string;
}

export interface PartnerTrendSeriesPoint {
  monthId: string;
  label: string;
  totalUsers: number;
  totalCollection: string;
}

export interface PartnerTrend {
  partnerId: string;
  partnerName: string;
  series: PartnerTrendSeriesPoint[];
}

export interface DashboardTrends {
  overall: MonthTrendPoint[];
  byPartner: PartnerTrend[];
}

export interface MonthTotals {
  totalUsers: number;
  totalCollection: string;
  totalCommission: string;
  totalBusinessAmount: string;
  totalDeposits: string;
  totalDueWithBonus: string;
  totalDueAfterBonus: string;
  avgCommissionPct: string;
  avgBonusPct: string;
}

export interface DashboardData {
  monthId: string;
  totals: MonthTotals;
  costs: { items: CostItem[]; totalCost: string };
  profit: string;
  ledgerBalance: string;
}

// /api/vouchers is never role-restricted (staff needs the full breakdown to
// print a voucher) - so unlike PartnerMonthEntry, every field is guaranteed.
export interface VoucherEntry {
  id: string;
  partnerId: string;
  monthId: string;
  totalUsers: number;
  totalCollection: string;
  commissionPct: string;
  bonusPct: string;
  discount: string;
  lastMonthDue: string;
  depositBy15th: string;
  totalDeposit: string;
  commissionAmount: string;
  businessAmount: string;
  bonusAmount: string;
  dueWithBonus: string;
  dueAfterBonus: string;
}

export interface VoucherData {
  month: Month;
  partner: Partner;
  entry: VoucherEntry;
  generatedAt: string;
}

// GET /api/reports/monthly - always the full shape (deposit/due included)
// regardless of caller's role, unlike PartnerMonthEntry from /api/entries.
// Access itself is gated server-side by AppSettings.allowStaffMonthlyReport.
export interface MonthlyReportRow {
  id: string;
  partnerId: string;
  partner: Partner;
  totalUsers: number;
  totalCollection: string;
  businessAmount: string;
  bonusAmount: string;
  totalDeposit: string;
  dueAfterBonus: string;
}

export interface AppSettings {
  id: string;
  allowStaffMonthlyReport: boolean;
}
