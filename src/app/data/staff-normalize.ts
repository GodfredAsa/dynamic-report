import { AppUser, STAFF_CARD_TYPES, StaffCategory } from './app-user.model';

const ALLOWED_CARD_TYPES = new Set<string>(STAFF_CARD_TYPES);

export function normalizeStaffCategory(raw: unknown): StaffCategory {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
  if (s === 'non-teaching' || s === 'nonteaching') return 'non-teaching';
  return 'teaching';
}

export function normalizeCardType(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (ALLOWED_CARD_TYPES.has(s)) return s;
  return STAFF_CARD_TYPES[0];
}

export function normalizeAppUser(raw: Partial<AppUser>): AppUser | null {
  const id = String(raw.id ?? '').trim();
  const displayName = String(raw.displayName ?? '').trim();
  const email = String(raw.email ?? '').trim().toLowerCase();
  if (!id || !displayName || !email) return null;
  return {
    id,
    displayName,
    email,
    password: String(raw.password ?? ''),
    cardNumber: String(raw.cardNumber ?? '').trim(),
    cardType: normalizeCardType(raw.cardType),
    staffCategory: normalizeStaffCategory(raw.staffCategory),
  };
}

export function normalizeStaffList(raw: unknown): AppUser[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => normalizeAppUser(x as Partial<AppUser>))
    .filter((x): x is AppUser => x !== null);
}
