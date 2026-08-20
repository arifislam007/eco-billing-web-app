import { describe, expect, it } from "vitest";
import {
  computeEntry,
  computeLedgerBalance,
  computeMonthTotals,
  computeProfit,
  round2,
  roundMoney,
  sumDecimals,
} from "../calc";

describe("computeEntry", () => {
  it("matches Bilal Bhai from the July-26 seed fixture, money rounded to whole taka", () => {
    const result = computeEntry({
      totalCollection: 138980,
      commissionPct: 0.45,
      bonusPct: 0.03,
      discount: 0,
      lastMonthDue: 0,
      totalDeposit: 0,
    });

    expect(result.commissionAmount.toString()).toBe("62541");
    expect(result.businessAmount.toString()).toBe("76439");
    // exact bonus is 2293.17 - rounded to the nearest whole taka
    expect(result.bonusAmount.toString()).toBe("2293");
    expect(result.dueWithBonus.toString()).toBe("76439");
    // exact due-after-bonus is 74145.83 - rounds up to 74146
    expect(result.dueAfterBonus.toString()).toBe("74146");
  });

  it("treats missing deposit/discount/lastMonthDue as zero", () => {
    const result = computeEntry({
      totalCollection: 1000,
      commissionPct: 0.45,
      bonusPct: 0,
      discount: 0,
      lastMonthDue: 0,
      totalDeposit: 0,
    });
    expect(result.businessAmount.toString()).toBe("550");
    expect(result.dueWithBonus.toString()).toBe("550");
    expect(result.dueAfterBonus.toString()).toBe("550");
  });

  it("carries last month due forward into due amounts", () => {
    const result = computeEntry({
      totalCollection: 1000,
      commissionPct: 0.45,
      bonusPct: 0.1,
      discount: 50,
      lastMonthDue: 200,
      totalDeposit: 300,
    });
    // business = 550; bonus = 55
    expect(result.businessAmount.toString()).toBe("550");
    expect(result.bonusAmount.toString()).toBe("55");
    // dueWithBonus = 550 - 300 - 50 + 200 = 400
    expect(result.dueWithBonus.toString()).toBe("400");
    // dueAfterBonus = 550 - 300 - 55 - 50 + 200 = 345
    expect(result.dueAfterBonus.toString()).toBe("345");
  });

  it("handles Mitul Bhai's 100% commission edge case (business amount = 0)", () => {
    const result = computeEntry({
      totalCollection: 131400,
      commissionPct: 1.0,
      bonusPct: 0,
      discount: 0,
      lastMonthDue: 0,
      totalDeposit: 0,
    });
    expect(result.commissionAmount.toString()).toBe("131400");
    expect(result.businessAmount.toString()).toBe("0");
    expect(result.bonusAmount.toString()).toBe("0");
  });
});

describe("computeMonthTotals + computeProfit", () => {
  const partners = [
    { collection: 81900, commissionPct: 0.45, bonusPct: 0.02, users: 165 },
    { collection: 151150, commissionPct: 0.45, bonusPct: 0.02, users: 311 },
    { collection: 239300, commissionPct: 0.45, bonusPct: 0.1, users: 477 },
    { collection: 70300, commissionPct: 0.45, bonusPct: 0.05, users: 169 },
    { collection: 138980, commissionPct: 0.45, bonusPct: 0.03, users: 295 },
    { collection: 110200, commissionPct: 0.45, bonusPct: 0.03, users: 220 },
    { collection: 60300, commissionPct: 0.45, bonusPct: 0.03, users: 127 },
    { collection: 43400, commissionPct: 0.45, bonusPct: 0.03, users: 141 },
    { collection: 102450, commissionPct: 0.45, bonusPct: 0.05, users: 231 },
    { collection: 4200, commissionPct: 0.45, bonusPct: 0.03, users: 12 },
    { collection: 126900, commissionPct: 0.45, bonusPct: 0, users: 282 },
    { collection: 8000, commissionPct: 0.45, bonusPct: 0, users: 21 },
    { collection: 131400, commissionPct: 1.0, bonusPct: 0, users: 272 },
  ];

  const rows = partners.map((p) => ({
    totalUsers: p.users,
    totalCollection: p.collection,
    commissionPct: p.commissionPct,
    bonusPct: p.bonusPct,
    totalDeposit: 0,
    computed: computeEntry({
      totalCollection: p.collection,
      commissionPct: p.commissionPct,
      bonusPct: p.bonusPct,
      discount: 0,
      lastMonthDue: 0,
      totalDeposit: 0,
    }),
  }));

  it("reproduces the July-26 seed totals", () => {
    const totals = computeMonthTotals(rows);
    expect(totals.totalUsers).toBe(2723);
    expect(totals.totalCollection.toString()).toBe("1268480");
    // Exact total is 625394; a couple of partners' businessAmount is itself
    // a .5 value (e.g. Helal Bhai 151150 * 0.45 commission -> 83132.5
    // business), each rounds up independently, so the sum of already-rounded
    // parts lands one taka above the old exact-precision total.
    expect(totals.totalBusinessAmount.toString()).toBe("625395");
  });

  it("computes profit as business amount minus total cost", () => {
    const totals = computeMonthTotals(rows);
    const totalBonus = sumDecimals(rows.map((r) => r.computed.bonusAmount));
    const totalCost = sumDecimals([409161, 6800, 12000, 7492]).add(totalBonus);
    const profit = computeProfit(totals.totalBusinessAmount, totalCost);

    // Sum of each partner's already-rounded (whole taka) bonus, not the
    // exact fractional sum - 26367.495 exact, 26367 as rounded parts.
    expect(totalBonus.toString()).toBe("26367");
    expect(totalCost.toString()).toBe("461820");
    expect(profit.toString()).toBe("163575");
  });
});

describe("computeLedgerBalance", () => {
  it("sums receive minus send across transactions, rounded to whole taka", () => {
    const balance = computeLedgerBalance([
      { send: 100, receive: 500 },
      { send: 50, receive: 0 },
      { send: 0, receive: 25.5 },
    ]);
    // exact balance is 375.5, rounds up to 376
    expect(balance.toString()).toBe("376");
  });

  it("returns zero for an empty ledger", () => {
    expect(computeLedgerBalance([]).toString()).toBe("0");
  });
});

describe("round2", () => {
  it("rounds to 2 decimal places - used for percentages, not money", () => {
    expect(round2(1.005).toString()).toBe("1.01");
    expect(round2(2.004).toString()).toBe("2");
  });
});

describe("roundMoney", () => {
  it("rounds to the nearest whole number - every monetary figure goes through this", () => {
    expect(roundMoney(2293.17).toString()).toBe("2293");
    expect(roundMoney(74145.83).toString()).toBe("74146");
    expect(roundMoney(1.5).toString()).toBe("2");
    expect(roundMoney(100).toString()).toBe("100");
  });
});
