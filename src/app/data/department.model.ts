/** One class group within a department (e.g. Form 1 A). */
export interface DepartmentClass {
  id: string;
  name: string;
  /** Student `id` values from `public/data/students.json` in this class. */
  assignedStudentIds: string[];
}

/** Department record — matches downloadable / importable JSON. */
export interface Department {
  id: string;
  /** Must be unique among departments (case-insensitive), enforced in the store. */
  name: string;
  /** Head display name (denormalized for JSON readability / legacy rows). */
  head: string;
  /** Staff `id` from `public/data/staff.json` for the department head. */
  headStaffId: string;
  description: string;
  /** Class groups in this department; always empty when the row is first created via the UI. */
  classes: DepartmentClass[];
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

function normalizeDepartmentClasses(raw: unknown, deptId: string): DepartmentClass[] {
  if (!Array.isArray(raw)) return [];
  const deptSlug = String(deptId ?? 'DEPT').replace(/[^a-zA-Z0-9-_]/g, '');
  const out: DepartmentClass[] = [];
  let n = 0;
  const taken = new Set<string>();
  for (const x of raw) {
    if (typeof x === 'string') {
      const name = x.trim();
      if (!name) continue;
      n++;
      let id = `class-${deptSlug}-${String(n).padStart(2, '0')}`;
      while (taken.has(id)) {
        n++;
        id = `class-${deptSlug}-${String(n).padStart(2, '0')}`;
      }
      taken.add(id);
      out.push({ id, name, assignedStudentIds: [] });
      continue;
    }
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      const name = String(o['name'] ?? '').trim();
      if (!name) continue;
      let id = String(o['id'] ?? '').trim();
      if (!id) {
        n++;
        id = `class-${deptSlug}-${String(n).padStart(2, '0')}`;
        while (taken.has(id)) {
          n++;
          id = `class-${deptSlug}-${String(n).padStart(2, '0')}`;
        }
      }
      if (taken.has(id)) continue;
      taken.add(id);
      out.push({
        id,
        name,
        assignedStudentIds: normalizeAssignedStaffIds(o['assignedStudentIds']),
      });
    }
  }
  return out;
}

export function normalizeDepartment(raw: Partial<Department>): Department {
  const id = String(raw.id ?? '').trim();
  const name = String(raw.name ?? '').trim();
  const head = String(raw.head ?? '').trim();
  const headStaffId = String(raw.headStaffId ?? '').trim();
  const description = String(raw.description ?? '').trim();
  const classes = id ? normalizeDepartmentClasses(raw.classes, id) : [];
  return {
    id,
    name,
    head,
    headStaffId,
    description,
    classes,
    members: Math.max(0, Math.floor(Number(raw.members) || 0)),
    students: Math.max(0, Math.floor(Number(raw.students) || 0)),
    location: String(raw.location ?? '').trim(),
    status: String(raw.status ?? 'Active').trim() || 'Active',
    assignedStaffIds: normalizeAssignedStaffIds(raw.assignedStaffIds),
    assignedStudentIds: normalizeAssignedStaffIds(raw.assignedStudentIds),
  };
}

export function toDepartmentInput(d: Department): DepartmentInput {
  return {
    name: d.name,
    head: d.head,
    headStaffId: d.headStaffId,
    description: d.description,
    classes: d.classes.map((c) => ({
      id: c.id,
      name: c.name,
      assignedStudentIds: [...(c.assignedStudentIds ?? [])],
    })),
    members: d.members,
    students: d.students,
    location: d.location,
    status: d.status,
    assignedStaffIds: [...d.assignedStaffIds],
    assignedStudentIds: [...(d.assignedStudentIds ?? [])],
  };
}
