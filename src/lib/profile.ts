export const PROFILE_NAME_KEY = "wortschatz-profile-name";

export function normalizeProfileName(value: string): string | null {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    normalized.length < 2 ||
    normalized.length > 30 ||
    !/^[\p{L}][\p{L}\p{M} '-]*$/u.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function storedProfileName(): string | null {
  try {
    const value = localStorage.getItem(PROFILE_NAME_KEY);
    return value ? normalizeProfileName(value) : null;
  } catch {
    return null;
  }
}

export function rememberProfileName(value: string): string | null {
  const normalized = normalizeProfileName(value);
  if (!normalized) return null;
  try {
    localStorage.setItem(PROFILE_NAME_KEY, normalized);
    return normalized;
  } catch {
    return null;
  }
}
