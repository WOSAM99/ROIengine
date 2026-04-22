const MONEY_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const MONEY_WITH_CENTS_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INT_FMT = new Intl.NumberFormat("en-US");

export function formatMoney(value: string | number, opts?: { withCents?: boolean }): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "—";
  return opts?.withCents ? MONEY_WITH_CENTS_FMT.format(num) : MONEY_FMT.format(num);
}

export function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return INT_FMT.format(value);
}
