/**
 * Student row — same shape as objects in `public/data/students.json`.
 */

export const STUDENT_GENDERS = ['male', 'female'] as const;
export type StudentGender = (typeof STUDENT_GENDERS)[number];

export interface Student {
  id: string;
  /** Learner’s full name. */
  displayName: string;
  gender: StudentGender;
  /** Parent or guardian full name. */
  guardianName: string;
  /** Guardian mobile / phone (digits and common separators). */
  guardianPhone: string;
}
