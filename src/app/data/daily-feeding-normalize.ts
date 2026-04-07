import { DailyFeedingSummary } from './daily-feeding.model';

const DEFAULT: DailyFeedingSummary = {
  dayLabel: 'Today',
  currency: 'GHS',
  totalAmount: 0,
};

export function normalizeDailyFeedingSummary(raw: unknown): DailyFeedingSummary {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT };
  const o = raw as Record<string, unknown>;
  const amt = Number(o['totalAmount']);
  const cur = String(o['currency'] ?? 'GHS')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return {
    dayLabel: String(o['dayLabel'] ?? DEFAULT.dayLabel).trim() || DEFAULT.dayLabel,
    currency: cur.length === 3 ? cur : 'GHS',
    totalAmount: Number.isFinite(amt) ? Math.max(0, amt) : 0,
  };
}
