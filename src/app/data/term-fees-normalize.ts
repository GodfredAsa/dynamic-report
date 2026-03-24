import { TermFeesSummary } from './term-fees.model';

const DEFAULT: TermFeesSummary = {
  termLabel: 'Current term',
  currency: 'GHS',
  totalPaid: 0,
};

export function normalizeTermFeesSummary(raw: unknown): TermFeesSummary {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT };
  const o = raw as Record<string, unknown>;
  const paid = Number(o['totalPaid']);
  const cur = String(o['currency'] ?? 'GHS')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return {
    termLabel: String(o['termLabel'] ?? DEFAULT.termLabel).trim() || DEFAULT.termLabel,
    currency: cur.length === 3 ? cur : 'GHS',
    totalPaid: Number.isFinite(paid) ? Math.max(0, paid) : 0,
  };
}
