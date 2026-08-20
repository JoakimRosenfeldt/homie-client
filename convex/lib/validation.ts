import { ConvexError } from "convex/values";

export function boundedText(
  value: string,
  input: { field: string; minimum?: number; maximum: number },
) {
  const trimmed = value.trim();
  if (trimmed.length < (input.minimum ?? 1) || trimmed.length > input.maximum) {
    throw new ConvexError(
      `${input.field} must contain ${input.minimum ?? 1} to ${input.maximum} characters.`,
    );
  }
  return trimmed;
}

export function optionalBoundedText(
  value: string | undefined,
  input: { field: string; maximum: number },
) {
  if (value === undefined || value.trim().length === 0) return undefined;
  return boundedText(value, { ...input, minimum: 1 });
}

export function boundedNumber(
  value: number,
  input: { field: string; minimum: number; maximum: number; integer?: boolean },
) {
  if (
    !Number.isFinite(value) ||
    value < input.minimum ||
    value > input.maximum ||
    (input.integer && !Number.isInteger(value))
  ) {
    throw new ConvexError(
      `${input.field} must be between ${input.minimum} and ${input.maximum}.`,
    );
  }
  return value;
}

export function optionalBoundedNumber(
  value: number | undefined,
  input: { field: string; minimum: number; maximum: number; integer?: boolean },
) {
  return value === undefined ? undefined : boundedNumber(value, input);
}

export function boundedArray<T>(
  values: T[],
  input: { field: string; maximum: number },
) {
  if (values.length > input.maximum) {
    throw new ConvexError(`${input.field} can contain at most ${input.maximum} items.`);
  }
  return values;
}
