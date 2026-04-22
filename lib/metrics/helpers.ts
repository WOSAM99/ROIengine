import { Decimal } from "decimal.js";

export const ZERO = new Decimal(0);

export function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

export function marginPercent(revenue: Decimal, cost: Decimal): number {
  if (revenue.isZero()) return 0;
  const gp = revenue.minus(cost);
  return round2(gp.div(revenue).times(100).toNumber());
}

export function divideSafe(numerator: Decimal, denominator: Decimal): Decimal {
  if (denominator.isZero()) return ZERO;
  return numerator.div(denominator);
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function toMoneyString(value: Decimal): string {
  return value.toDecimalPlaces(2).toString();
}
