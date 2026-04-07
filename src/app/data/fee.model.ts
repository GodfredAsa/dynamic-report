/**
 * Fee ledger row — `public/data/fees.json` (array).
 */

export const FEE_TYPES = ['Utility', 'Feeding', 'Classes', 'Termly money'] as const;
export type FeeType = (typeof FEE_TYPES)[number];

export interface FeeUse {
  /** Portion of this fee that was used. */
  amountUsed: number;
  /** Short description / purpose for this usage. */
  purpose: string;
}

export interface FeeRecord {
  id: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  type: FeeType;
  /** Monetary amount for this fee entry. */
  amount: number;
  currency: string;
  addedByName: string;
  addedByEmail: string;
   /** Optional breakdown of how this fee has been used. */
  uses?: FeeUse[];
}
