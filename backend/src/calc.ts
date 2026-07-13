import { Decimal } from "@prisma/client/runtime/library";

export type Num = Decimal | number | string;

const D = (v: Num) => new Decimal(v);

/** Round to 2 decimal places for display/storage. Single place to change rounding policy. */
export function round2(v: Num): Decimal {
  return D(v).toDecimalPlaces(2);
}

export interface EntryInputs {
  totalCollection: Num;
  commissionPct: Num;
  bonusPct: Num;
  discount: Num;
  lastMonthDue: Num;
  totalDeposit: Num;
}

export interface EntryComputed {
  commissionAmount: Decimal;
  businessAmount: Decimal;
  bonusAmount: Decimal;
  dueWithBonus: Decimal;
  dueAfterBonus: Decimal;
}

/**
 * Core PartnerMonthEntry formulas, mirroring the Excel columns:
 * Commission Amount = Collection * Commission%
 * Business Amount   = Collection - Commission Amount
 * Bonus              = Business Amount * Bonus%
 * Due with bonus     = Business - Deposit - Discount + LastMonthDue
 * Due after bonus     = Business - Deposit - Bonus - Discount + LastMonthDue
 */
export function computeEntry(inputs: EntryInputs): EntryComputed {
  const collection = D(inputs.totalCollection);
  const commissionPct = D(inputs.commissionPct);
  const bonusPct = D(inputs.bonusPct);
  const discount = D(inputs.discount);
  const lastMonthDue = D(inputs.lastMonthDue);
  const totalDeposit = D(inputs.totalDeposit);

  const commissionAmount = collection.mul(commissionPct);
  const businessAmount = collection.sub(commissionAmount);
  const bonusAmount = businessAmount.mul(bonusPct);
  const dueWithBonus = businessAmount.sub(totalDeposit).sub(discount).add(lastMonthDue);
  const dueAfterBonus = businessAmount
    .sub(totalDeposit)
    .sub(bonusAmount)
    .sub(discount)
    .add(lastMonthDue);

  return {
    commissionAmount: round2(commissionAmount),
    businessAmount: round2(businessAmount),
    bonusAmount: round2(bonusAmount),
    dueWithBonus: round2(dueWithBonus),
    dueAfterBonus: round2(dueAfterBonus),
  };
}

export function sumDecimals(values: Num[]): Decimal {
  return values.reduce((acc: Decimal, v) => acc.add(D(v)), D(0));
}

export interface MonthTotals {
  totalUsers: number;
  totalCollection: Decimal;
  totalCommission: Decimal;
  totalBusinessAmount: Decimal;
  totalDeposits: Decimal;
  totalDueWithBonus: Decimal;
  totalDueAfterBonus: Decimal;
  avgCommissionPct: Decimal;
  avgBonusPct: Decimal;
}

export function computeMonthTotals(
  rows: Array<{
    totalUsers: number;
    totalCollection: Num;
    commissionPct: Num;
    bonusPct: Num;
    computed: EntryComputed;
    totalDeposit: Num;
  }>
): MonthTotals {
  const n = rows.length || 1;
  return {
    totalUsers: rows.reduce((a, r) => a + r.totalUsers, 0),
    totalCollection: sumDecimals(rows.map((r) => r.totalCollection)),
    totalCommission: sumDecimals(rows.map((r) => r.computed.commissionAmount)),
    totalBusinessAmount: sumDecimals(rows.map((r) => r.computed.businessAmount)),
    totalDeposits: sumDecimals(rows.map((r) => r.totalDeposit)),
    totalDueWithBonus: sumDecimals(rows.map((r) => r.computed.dueWithBonus)),
    totalDueAfterBonus: sumDecimals(rows.map((r) => r.computed.dueAfterBonus)),
    avgCommissionPct: round2(sumDecimals(rows.map((r) => r.commissionPct)).div(n).mul(100)),
    avgBonusPct: round2(sumDecimals(rows.map((r) => r.bonusPct)).div(n).mul(100)),
  };
}

export function computeProfit(totalBusinessAmount: Num, totalCost: Num): Decimal {
  return round2(D(totalBusinessAmount).sub(D(totalCost)));
}

export function computeLedgerBalance(transactions: Array<{ send: Num; receive: Num }>): Decimal {
  const totalReceive = sumDecimals(transactions.map((t) => t.receive));
  const totalSend = sumDecimals(transactions.map((t) => t.send));
  return round2(totalReceive.sub(totalSend));
}
