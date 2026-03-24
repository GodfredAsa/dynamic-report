/** Department record — matches downloadable / importable JSON. */
export interface Department {
  id: string;
  name: string;
  head: string;
  members: number;
  students: number;
  location: string;
  status: string;
  /** Staff `id` values from `public/data/staff.json` (e.g. usr-1). */
  assignedStaffIds: string[];
  /** Student `id` values from `public/data/students.json` (e.g. stu-1). */
  assignedStudentIds: string[];
}

/** Fields collected in the UI; `id` is assigned when saving. */
export type DepartmentInput = Omit<Department, 'id'>;

export function normalizeAssignedStaffIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  for (const x of raw) {
    const s = String(x ?? '').trim();
    if (s) ids.add(s);
  }
  return [...ids];
}

export function normalizeDepartment(raw: Partial<Department>): Department {
  return {
    id: String(raw.id ?? '').trim(),
    name: String(raw.name ?? '').trim(),
    head: String(raw.head ?? '').trim(),
    members: Math.max(0, Math.floor(Number(raw.members) || 0)),
    students: Math.max(0, Math.floor(Number(raw.students) || 0)),
    location: String(raw.location ?? '').trim(),
    status: String(raw.status ?? 'Active').trim() || 'Active',
    assignedStaffIds: normalizeAssignedStaffIds(raw.assignedStaffIds),
    assignedStudentIds: normalizeAssignedStaffIds(raw.assignedStudentIds),
  };
}
