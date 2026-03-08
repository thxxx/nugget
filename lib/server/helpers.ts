export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function trimNickname(value: string) {
  return value.trim();
}

export function normalizeNickname(value: string) {
  return trimNickname(value).toLowerCase();
}

export function normalizeVisitStatus(value: unknown): "planned" | "visited" {
  if (value === "visited") {
    return "visited";
  }

  return "planned";
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    const safeTag = trimmed.slice(0, 20);
    unique.add(safeTag);

    if (unique.size >= 10) {
      break;
    }
  }

  return Array.from(unique);
}

export function normalizePublicFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return true;
}

export function normalizeSaveRating(value: unknown): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  return 3;
}
