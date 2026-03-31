import { AppRole, AppUser, APP_ROLES, STAFF_CARD_TYPES, STAFF_GENDERS, StaffCategory, StaffGender } from './app-user.model';

const ALLOWED_CARD_TYPES = new Set<string>(STAFF_CARD_TYPES);
const ALLOWED_ROLES = new Set<string>(APP_ROLES);
const ALLOWED_GENDERS = new Set<string>(STAFF_GENDERS);

export function normalizeStaffGender(raw: unknown): StaffGender {
  const s = String(raw ?? '').trim().toLowerCase();
  if (ALLOWED_GENDERS.has(s)) return s as StaffGender;
  return 'male';
}

function normalizeRole(raw: unknown): AppRole | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '_');
  // allow a few friendlier aliases
  if (s === 'ALL_PRIVILEGES' || s === 'ALL_PRIVILEGE' || s === 'SUPERUSER') return 'ADMIN';
  if (s === 'CLASSES_&_DEPARTMENTS' || s === 'CLASSES_AND_DEPARTMENTS') return 'CLASSES';
  if (s === 'FEES_MANAGEMENT') return 'FEES';
  if (s === 'STATISTICS_&_PERFORMANCE' || s === 'STATISTICS_AND_PERFORMANCE') return 'STATISTICS';
  if (!ALLOWED_ROLES.has(s)) return null;
  return s as AppRole;
}

export function normalizeRoles(raw: unknown): AppRole[] {
  if (!Array.isArray(raw)) return ['STAFF'];
  const out: AppRole[] = [];
  for (const x of raw) {
    const r = normalizeRole(x);
    if (r && !out.includes(r)) out.push(r);
  }
  return out.length ? out : ['STAFF'];
}

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
    gender: normalizeStaffGender((raw as any).gender),
    roles: normalizeRoles((raw as any).roles),
  };
}

export function normalizeStaffList(raw: unknown): AppUser[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => normalizeAppUser(x as Partial<AppUser>))
    .filter((x): x is AppUser => x !== null);
}
