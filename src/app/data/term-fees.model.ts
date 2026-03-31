/**
 * Single summary row for the active term — `public/data/term-fees.json`.
 * Update `totalPaid` as fees are collected (or via Fees module when built).
 */

export interface TermFeesSummary {
  /** e.g. "Term 1 · 2025" */
  termLabel: string;
  /** ISO 4217 code, e.g. GHS */
  currency: string;
  /** Sum of payments recorded for this term. */
  totalPaid: number;
  /** Term start date (YYYY-MM-DD, optional). */
  startDate?: string;
  /** Term end date (YYYY-MM-DD, optional). */
  endDate?: string;
  /** Computed number of weeks between start and end (optional, for display). */
  weeks?: number;
}
