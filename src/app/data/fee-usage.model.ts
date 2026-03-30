/**
 * Fee usage row — `public/data/fees-usage.json` (array).
 *
 * Represents money taken from a fee category (deduction) on a date.
 */

import { FEE_TYPES, FeeType } from './fee.model';

export const FEE_USAGE_CURRENCY_DEFAULT = 'GHS' as const;

export type FeeUsageType = FeeType;

export interface FeeUsageRecord {
  id: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** Fee category from which money was used. */
  type: FeeUsageType;
  /** Monetary amount that was used/deducted from the category. */
  amount: number;
  currency: string;
  usedByName: string;
  usedByEmail: string;
}

export const FEE_USAGE_TYPES = FEE_TYPES;

