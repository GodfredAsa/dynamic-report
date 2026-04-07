import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Student } from './student.model';
import { normalizeStudent, normalizeStudentList } from './student-normalize';

/**
 * Students: loaded from `public/data/students.json` (`GET /data/students.json`).
 * Writes via `POST /api/students` when the dev data API is running (`npm run data-api`).
 */
export const STUDENTS_JSON_PATH = '/data/students.json';
export const STUDENTS_SAVE_API = '/api/students';

const FALLBACK_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    displayName: 'Kofi Mensah',
    gender: 'male',
    guardianName: 'Ama Mensah',
    guardianPhone: '+233 24 000 0001',
  },
  {
    id: 'stu-2',
    displayName: 'Abena Owusu',
    gender: 'female',
    guardianName: 'Kwame Owusu',
    guardianPhone: '+233 20 000 0002',
  },
];

function sortStudents(list: Student[]): Student[] {
  return [...list].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
  );
}

@Injectable({ providedIn: 'root' })
export class StudentStoreService {
  private http = inject(HttpClient);
  private doc = inject(DOCUMENT);

  readonly students = signal<Student[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal('');

  private readonly initialLoad: Promise<void>;

  constructor() {
    this.initialLoad = this.loadFromFile(false);
  }

  async waitUntilLoaded(): Promise<void> {
    await this.initialLoad;
  }

  private studentsUrl(bustCache: boolean): string {
    return bustCache ? `${STUDENTS_JSON_PATH}?t=${Date.now()}` : STUDENTS_JSON_PATH;
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const file = await firstValueFrom(this.http.get<unknown>(this.studentsUrl(bustCache)));
      const fromFile = normalizeStudentList(file);
      if (fromFile.length > 0) {
        this.students.set(sortStudents(fromFile));
        this.loaded.set(true);
        return;
      }
    } catch {
      this.loadError.set('Could not load /data/students.json');
    }
    this.students.set(sortStudents(FALLBACK_STUDENTS.map((s) => ({ ...s }))));
    this.loaded.set(true);
  }

  async reloadFromStudentsFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  restoreInMemory(list: Student[]): void {
    this.students.set([...list]);
  }

  private async syncStudentsToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(STUDENTS_SAVE_API, this.students(), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          'Could not save students.json. Run npm run data-api in a second terminal (with ng serve).',
      };
    }
  }

  async commitStudentsAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = await this.syncStudentsToDisk();
    if (!s.ok) return s;
    await this.loadFromFile(true);
    return { ok: true };
  }

  nextStudentId(): string {
    let max = 0;
    for (const s of this.students()) {
      const m = /^stu-(\d+)$/i.exec(s.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `stu-${max + 1}`;
  }

  addStudent(input: Omit<Student, 'id'>): { ok: true } | { ok: false; error: string } {
    const id = this.nextStudentId();
    const row = normalizeStudent({
      ...input,
      id,
      displayName: String(input.displayName ?? '').trim(),
      guardianName: String(input.guardianName ?? '').trim(),
      guardianPhone: String(input.guardianPhone ?? '').trim(),
    });
    if (!row) {
      return {
        ok: false,
        error: 'Student name, gender, guardian name, and guardian phone are required.',
      };
    }
    this.students.update((list) => [...list, row]);
    return { ok: true };
  }

  updateStudent(id: string, input: Omit<Student, 'id'>): { ok: true } | { ok: false; error: string } {
    const idx = this.students().findIndex((s) => s.id === id);
    if (idx < 0) return { ok: false, error: 'Student not found.' };
    const row = normalizeStudent({
      ...input,
      id,
      displayName: String(input.displayName ?? '').trim(),
      guardianName: String(input.guardianName ?? '').trim(),
      guardianPhone: String(input.guardianPhone ?? '').trim(),
    });
    if (!row) {
      return {
        ok: false,
        error: 'Student name, gender, guardian name, and guardian phone are required.',
      };
    }
    this.students.update((list) => {
      const next = [...list];
      next[idx] = row;
      return sortStudents(next);
    });
    return { ok: true };
  }

  exportStudentsDownload(): void {
    const text = JSON.stringify(this.students(), null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = 'students.json';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  replaceAllInMemory(list: Student[]): void {
    this.students.set(sortStudents(normalizeStudentList(list)));
  }

  parseStudentsJson(text: string): { ok: true; data: Student[] } | { ok: false; error: string } {
    try {
      const data = JSON.parse(text) as unknown;
      const rows = normalizeStudentList(data);
      if (rows.length === 0) {
        return {
          ok: false,
          error: 'No valid student rows (need id, displayName, gender male|female, guardianName, guardianPhone).',
        };
      }
      return { ok: true, data: rows };
    } catch {
      return { ok: false, error: 'Invalid JSON.' };
    }
  }
}
