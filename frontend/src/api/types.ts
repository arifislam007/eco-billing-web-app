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

export interface PartnerMonthEntry {
  id: string;
  partnerId: string;
  monthId: string;
  totalUsers: number;
  totalCollection: string;
  commissionPct: string;
  bonusPct: string;
  discount: string;
  lastMonthDue: string;
  partner?: Partner;
  // computed
  depositBy15th: string;
  totalDeposit: string;
  commissionAmount: string;
  businessAmount: string;
  bonusAmount: string;
  dueWithBonus: string;
  dueAfterBonus: string;
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

export interface VoucherData {
  month: Month;
  partner: Partner;
  entry: PartnerMonthEntry;
  generatedAt: string;
}
