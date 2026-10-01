export function formatNumber(value: number, maximumFractionDigits = 3): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatCoefficient(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toExponential(6).replace("e-", " × 10⁻").replace("e+", " × 10⁺");
}

export function formatScientific(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toExponential(4).replace("e+", " × 10⁺").replace("e-", " × 10⁻");
}

export function formatUnit(value: number, unit: string, digits = 2): string {
  return `${formatNumber(value, digits)} ${unit}`;
}

export function percentageDifference(actual: number, reference: number): number {
  if (reference === 0) return actual === 0 ? 0 : Number.NaN;
  return ((actual - reference) / reference) * 100;
}
