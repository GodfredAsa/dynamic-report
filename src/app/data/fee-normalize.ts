import { FeeRecord, FeeUse, FEE_TYPES, FeeType } from './fee.model';

const TYPE_SET = new Set<string>(FEE_TYPES);

function normalizeFeeType(raw: unknown): FeeType {
  const s = String(raw ?? '').trim();
  if (TYPE_SET.has(s)) return s as FeeType;
  return FEE_TYPES[0];
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

export function normalizeFeeRecord(raw: Partial<FeeRecord>): FeeRecord | null {
  const id = String(raw.id ?? '').trim();
  const date = normalizeISODate(raw.date);
  const type = normalizeFeeType(raw.type);
  const amt = Number(raw.amount);
  const amount = Number.isFinite(amt) ? Math.max(0, amt) : 0;
  const cur = String(raw.currency ?? 'GHS')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const currency = cur.length === 3 ? cur : 'GHS';
  const addedByName = String(raw.addedByName ?? '').trim();
  const addedByEmail = String(raw.addedByEmail ?? '')
    .trim()
    .toLowerCase();
  if (!id || !addedByName || !addedByEmail) return null;

  let uses: FeeUse[] | undefined;
  if (Array.isArray((raw as any).uses)) {
    uses = (raw as any).uses
      .map((u: any): FeeUse => {
        const amt = Number(u?.amountUsed);
        const amountUsed = Number.isFinite(amt) ? Math.max(0, amt) : 0;
        const purpose = String(u?.purpose ?? '').trim();
        return { amountUsed, purpose };
      })
      .filter((u: FeeUse) => u.amountUsed > 0 || u.purpose !== '');
    if ((uses as FeeUse[]).length === 0) {
      uses = undefined;
    }
  }

  return {
    id,
    date,
    type,
    amount,
    currency,
    addedByName,
    addedByEmail,
    uses,
  };
}

export function normalizeFeeList(raw: unknown): FeeRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => normalizeFeeRecord(x as Partial<FeeRecord>))
    .filter((x): x is FeeRecord => x !== null);
}
