/**
 * Daily school feeding spend summary — `public/data/daily-feeding.json`.
 */

export interface DailyFeedingSummary {
  /** e.g. "Mon 24 Mar 2025" or "Today" */
  dayLabel: string;
  currency: string;
  /** Total amount recorded for daily feeding (meals / provisions) for that day. */
  totalAmount: number;
}
