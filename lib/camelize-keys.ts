/**
 * Recursively transforms all snake_case keys in an object to camelCase.
 * Matches the SDK's internal camelizeKeys behavior for consistency.
 */

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && value.constructor === Object;
}

export function camelizeKeys<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => camelizeKeys(item)) as T;
  }

  if (!isPlainObject(input)) {
    return input as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    result[toCamelCase(key)] = camelizeKeys(value);
  }
  return result as T;
}
