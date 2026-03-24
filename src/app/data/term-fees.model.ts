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
}
