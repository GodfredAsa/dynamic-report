import { FEE_USAGE_TYPES, FeeUsageRecord } from './fee-usage.model';

const TYPE_SET = new Set<string>(FEE_USAGE_TYPES as unknown as string[]);

function normalizeUsageType(raw: unknown): FeeUsageRecord['type'] {
  const s = String(raw ?? '').trim();
  if (TYPE_SET.has(s)) return s as FeeUsageRecord['type'];
  return FEE_USAGE_TYPES[0];
}

function normalizeISODate(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeFeeUsageRecord(raw: Partial<FeeUsageRecord>): FeeUsageRecord | null {
  const id = String(raw.id ?? '').trim();
  const date = normalizeISODate(raw.date);
  const type = normalizeUsageType(raw.type);
  const amt = Number(raw.amount);
  const amount = Number.isFinite(amt) ? Math.max(0, amt) : 0;
  const cur = String(raw.currency ?? 'GHS')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const currency = cur.length === 3 ? cur : 'GHS';

  const usedByName = String(raw.usedByName ?? '').trim();
  const usedByEmail = String(raw.usedByEmail ?? '').trim().toLowerCase();

  if (!id || !date || !type || !usedByName || !usedByEmail) return null;
  return {
    id,
    date,
    type,
    amount,
    currency,
    usedByName,
    usedByEmail,
  };
}

export function normalizeFeeUsageList(raw: unknown): FeeUsageRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => normalizeFeeUsageRecord(x as Partial<FeeUsageRecord>))
    .filter((x): x is FeeUsageRecord => x !== null);
}

