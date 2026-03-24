import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Department, DepartmentInput, normalizeDepartment } from './department.model';

/**
 * Departments: read from `public/data/departments.json` (`GET /data/departments.json`).
 * Writes go through `POST /api/departments` (dev: run `npm run data-api`; proxied from ng serve).
 */
export const DEPARTMENTS_JSON_PATH = '/data/departments.json';

export const DEPARTMENTS_SAVE_API = '/api/departments';

@Injectable({ providedIn: 'root' })
export class DepartmentStoreService {
  private doc = inject(DOCUMENT);
  private http = inject(HttpClient);

  readonly departments = signal<Department[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal('');

  constructor() {
    void this.loadFromFile(false);
  }

  private url(bustCache: boolean): string {
    return bustCache ? `${DEPARTMENTS_JSON_PATH}?t=${Date.now()}` : DEPARTMENTS_JSON_PATH;
  }

  private normalizeList(raw: unknown): Department[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((x) => normalizeDepartment(x as Partial<Department>))
      .filter((d) => d.id);
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const data = await firstValueFrom(this.http.get<unknown>(this.url(bustCache)));
      this.departments.set(this.normalizeList(data));
      this.loaded.set(true);
    } catch {
      this.loadError.set('Could not load /data/departments.json');
      this.departments.set([]);
      this.loaded.set(true);
    }
  }

  async reloadFromDepartmentsFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  /** Replace in-memory list only (e.g. rollback after a failed save). */
  restoreInMemory(list: Department[]): void {
    this.departments.set([...list]);
  }

  private async syncToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(DEPARTMENTS_SAVE_API, this.departments(), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          'Could not save to public/data/departments.json. Start the writer API: npm run data-api (second terminal, with ng serve).',
      };
    }
  }

  /** Persist current list to disk (dev API) and reload from JSON so the table matches the file. */
  async commitAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = await this.syncToDisk();
    if (!s.ok) return s;
    await this.loadFromFile(true);
    return { ok: true };
  }

  add(input: DepartmentInput): { ok: true } | { ok: false; error: string } {
    const id = this.nextUniqueId();
    const d = normalizeDepartment({ ...input, id });
    if (!d.name) return { ok: false, error: 'Department name is required.' };
    this.departments.update((list) => [...list, d]);
    return { ok: true };
  }

  nextUniqueId(): string {
    const taken = new Set(this.departments().map((x) => x.id));
    let n = 1;
    for (;;) {
      const candidate = `DEPT-${String(n).padStart(2, '0')}`;
      if (!taken.has(candidate)) return candidate;
      n++;
    }
  }

  remove(id: string): void {
    const trimmed = id.trim();
    this.departments.update((list) => list.filter((d) => d.id !== trimmed));
  }

  /**
   * Add a student id to a department’s `assignedStudentIds` (no-op duplicate is an error).
   */
  addStudentToDepartment(
    deptId: string,
    studentId: string,
  ): { ok: true } | { ok: false; error: string } {
    const d = this.departments().find((x) => x.id === deptId.trim());
    if (!d) return { ok: false, error: 'Department not found.' };
    const sid = studentId.trim();
    if (!sid) return { ok: false, error: 'Pick a student.' };
    const cur = [...(d.assignedStudentIds ?? [])];
    if (cur.includes(sid)) {
      return { ok: false, error: 'This student is already assigned to this department.' };
    }
    cur.push(sid);
    const input: DepartmentInput = {
      name: d.name,
      head: d.head,
      members: d.members,
      students: d.students,
      location: d.location,
      status: d.status,
      assignedStaffIds: [...(d.assignedStaffIds ?? [])],
      assignedStudentIds: cur,
    };
    return this.update(deptId, input);
  }

  update(id: string, input: DepartmentInput): { ok: true } | { ok: false; error: string } {
    const trimmedId = id.trim();
    const list = this.departments();
    const idx = list.findIndex((d) => d.id === trimmedId);
    if (idx < 0) return { ok: false, error: 'Department not found.' };
    const d = normalizeDepartment({ ...input, id: trimmedId });
    if (!d.name) return { ok: false, error: 'Department name is required.' };
    this.departments.update((cur) => {
      const next = [...cur];
      next[idx] = d;
      return next;
    });
    return { ok: true };
  }

  replaceAll(list: Department[]): void {
    const seen = new Set<string>();
    const next: Department[] = [];
    for (const raw of list) {
      const d = normalizeDepartment(raw);
      if (!d.id || seen.has(d.id)) continue;
      seen.add(d.id);
      next.push(d);
    }
    this.departments.set(next);
  }

  mergeImport(incoming: Department[]): { added: number; updated: number } {
    const byId = new Map(this.departments().map((d) => [d.id, d]));
    let added = 0;
    let updated = 0;
    for (const raw of incoming) {
      const d = normalizeDepartment(raw);
      if (!d.id) continue;
      if (byId.has(d.id)) updated++;
      else added++;
      byId.set(d.id, d);
    }
    this.departments.set([...byId.values()].sort((a, b) => a.id.localeCompare(b.id)));
    return { added, updated };
  }

  exportDownload(): void {
    const text = JSON.stringify(this.departments(), null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = 'departments.json';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  parseImportFile(text: string): { ok: true; data: Department[] } | { ok: false; error: string } {
    try {
      const data = JSON.parse(text) as unknown;
      const rows: Department[] = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          rows.push(normalizeDepartment(item as Partial<Department>));
        }
      } else if (data && typeof data === 'object') {
        rows.push(normalizeDepartment(data as Partial<Department>));
      } else {
        return { ok: false, error: 'JSON must be an object or an array of objects.' };
      }
      const valid = rows.filter((d) => d.id);
      if (valid.length === 0) {
        return { ok: false, error: 'No valid department objects (each needs an `id`).' };
      }
      return { ok: true, data: valid };
    } catch {
      return { ok: false, error: 'Invalid JSON file.' };
    }
  }
}
