import { TermFeesSummary } from './term-fees.model';

const DEFAULT: TermFeesSummary = {
  termLabel: 'Current term',
  currency: 'GHS',
  totalPaid: 0,
  startDate: '',
  endDate: '',
  weeks: 0,
};

export function normalizeTermFeesSummary(raw: unknown): TermFeesSummary {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT };
  const o = raw as Record<string, unknown>;
  const paid = Number(o['totalPaid']);
  const cur = String(o['currency'] ?? 'GHS')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const startDateRaw = String(o['startDate'] ?? '').trim();
  const endDateRaw = String(o['endDate'] ?? '').trim();

  let weeks = 0;
  if (startDateRaw && endDateRaw) {
    const start = new Date(startDateRaw);
    const end = new Date(endDateRaw);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      const diffMs = end.getTime() - start.getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      weeks = Math.max(0, Math.round(diffMs / weekMs));
    }
  }

  return {
    termLabel: String(o['termLabel'] ?? DEFAULT.termLabel).trim() || DEFAULT.termLabel,
    currency: cur.length === 3 ? cur : 'GHS',
    totalPaid: Number.isFinite(paid) ? Math.max(0, paid) : 0,
    startDate: startDateRaw,
    endDate: endDateRaw,
    weeks,
  };
}
