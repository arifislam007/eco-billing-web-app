export function money(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function pct(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `${(n * 100).toFixed(n * 100 % 1 === 0 ? 0 : 2)}%`;
}
