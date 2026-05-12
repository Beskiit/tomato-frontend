type AnyObj = Record<string, unknown>;

function iso(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function toSnakeCaseObject(input: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const [key, value] of Object.entries(input)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (Array.isArray(value)) {
      out[snakeKey] = value.map((item) =>
        item instanceof Date
          ? item.toISOString()
          : item && typeof item === "object"
            ? toSnakeCaseObject(item as AnyObj)
            : iso(item)
      );
    } else if (value instanceof Date) {
      out[snakeKey] = value.toISOString();
    } else if (value && typeof value === "object") {
      out[snakeKey] = toSnakeCaseObject(value as AnyObj);
    } else {
      out[snakeKey] = iso(value);
    }
  }
  return out;
}

export function serialize<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((v) => serialize(v)) as T;
  }
  if (!input || typeof input !== "object") {
    return input;
  }
  return toSnakeCaseObject(input as AnyObj) as T;
}
