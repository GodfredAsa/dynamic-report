/**
 * School user / staff row — same shape as objects in `public/data/staff.json`.
 * Used for logins, department heads, etc.
 */

/** Allowed ID document types for staff. */
export const STAFF_CARD_TYPES = [
  'GHANA-CARD',
  'VOTERS CARD',
  'SSNIT',
  'DRIVER LICENSE',
] as const;

export type StaffCardType = (typeof STAFF_CARD_TYPES)[number];

/** Teaching vs non-teaching (admin, bursar, etc.) — used in reports and statistics. */
export const STAFF_CATEGORIES = ['teaching', 'non-teaching'] as const;
export type StaffCategory = (typeof STAFF_CATEGORIES)[number];

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  /**
   * Login secret stored as plain text in `staff.json` for this demo/local tool only.
   * Do not use this pattern for production or sensitive deployments.
   */
  password: string;
  /** ID card / document number (e.g. Ghana Card PIN). */
  cardNumber: string;
  /** One of `STAFF_CARD_TYPES`. */
  cardType: string;
  /** One of `STAFF_CATEGORIES`. */
  staffCategory: StaffCategory;
}
