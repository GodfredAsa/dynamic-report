import { Student, StudentGender } from './student.model';

export function normalizeGender(raw: unknown): StudentGender | null {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'male' || s === 'female') return s;
  return null;
}

export function normalizeStudent(raw: Partial<Student>): Student | null {
  const id = String(raw.id ?? '').trim();
  const displayName = String(raw.displayName ?? '').trim();
  const gender = normalizeGender(raw.gender);
  const guardianName = String(raw.guardianName ?? '').trim();
  const guardianPhone = String(raw.guardianPhone ?? '').trim();
  if (!id || !displayName || !gender || !guardianName || !guardianPhone) return null;
  return {
    id,
    displayName,
    gender,
    guardianName,
    guardianPhone,
  };
}

export function normalizeStudentList(raw: unknown): Student[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => normalizeStudent(x as Partial<Student>))
    .filter((x): x is Student => x !== null);
}
