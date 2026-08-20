// Every amount is a whole taka figure - no fractions, anywhere. Rounding
// happens server-side too (backend/src/calc.ts, roundMoney), this is just
// the display-side backstop so nothing fractional slips through visually.
export function money(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return Math.round(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

export function pct(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `${(n * 100).toFixed(n * 100 % 1 === 0 ? 0 : 2)}%`;
}
