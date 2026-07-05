import type { RatingValue } from "../types";

export function sanitizeWholeNumberInput(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(",", ".");
  let sanitized = "";
  let hasDecimal = false;

  for (const character of normalized) {
    if (/\d/.test(character)) {
      sanitized += character;
      continue;
    }

    if (character === "." && !hasDecimal) {
      sanitized += character;
      hasDecimal = true;
    }
  }

  return sanitized;
}

export function parseWholeNumberInput(value: string) {
  const parsed = Number(sanitizeWholeNumberInput(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function parseDecimalInput(value: string) {
  const parsed = Number(sanitizeDecimalInput(value));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function formatDecimalInputValue(value: number) {
  if (!value) {
    return "";
  }

  return String(Math.round(value * 1000) / 1000);
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

export function formatPercentInput(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return `${Math.round(value * 1000) / 10}`;
}

export function formatRatingValue(value: RatingValue) {
  return value === null ? "Check stats" : value.toFixed(2);
}
