import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppRole, AppUser } from './app-user.model';
import { normalizeAppUser, normalizeStaffList } from './staff-normalize';

/**
 * Staff/teachers: loaded from `public/data/staff.json` (`GET /data/staff.json`).
 * Writes via `POST /api/staff` when the dev data API is running (`npm run data-api`).
 */
export const STAFF_JSON_PATH = '/data/staff.json';
export const STAFF_SAVE_API = '/api/staff';

const FALLBACK_STAFF: AppUser[] = [
  {
    id: 'usr-1',
    displayName: 'Abi Administrator',
    email: 'abi@dynamic.com',
    password: '1234',
    cardNumber: '',
    cardType: 'GHANA-CARD',
    staffCategory: 'non-teaching',
    roles: ['STAFF'],
  },
  {
    id: 'usr-2',
    displayName: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@dynamic.com',
    password: '1234',
    cardNumber: '',
    cardType: 'GHANA-CARD',
    staffCategory: 'teaching',
    roles: ['STAFF'],
  },
  {
    id: 'usr-3',
    displayName: 'Mr. James Owusu',
    email: 'j.owusu@dynamic.com',
    password: '1234',
    cardNumber: '',
    cardType: 'GHANA-CARD',
    staffCategory: 'teaching',
    roles: ['STAFF'],
  },
  {
    id: 'usr-4',
    displayName: 'Ms. Ama Boateng',
    email: 'a.boateng@dynamic.com',
    password: '1234',
    cardNumber: '',
    cardType: 'GHANA-CARD',
    staffCategory: 'teaching',
    roles: ['STAFF'],
  },
];

function sortUsers(list: AppUser[]): AppUser[] {
  return [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
}

@Injectable({ providedIn: 'root' })
export class AppUserStoreService {
  private http = inject(HttpClient);
  private doc = inject(DOCUMENT);

  readonly users = signal<AppUser[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal('');

  /** Resolves when the first load from `staff.json` (or fallback) has finished. */
  private readonly initialLoad: Promise<void>;

  constructor() {
    this.initialLoad = this.loadFromFile(false);
  }

  async waitUntilLoaded(): Promise<void> {
    await this.initialLoad;
  }

  private staffUrl(bustCache: boolean): string {
    return bustCache ? `${STAFF_JSON_PATH}?t=${Date.now()}` : STAFF_JSON_PATH;
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const file = await firstValueFrom(this.http.get<unknown>(this.staffUrl(bustCache)));
      const fromFile = normalizeStaffList(file);
      if (fromFile.length > 0) {
        this.users.set(sortUsers(fromFile));
        this.loaded.set(true);
        return;
      }
    } catch {
      this.loadError.set('Could not load /data/staff.json');
    }
    this.users.set(sortUsers(FALLBACK_STAFF.map((u) => ({ ...u }))));
    this.loaded.set(true);
  }

  async reloadFromStaffFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  restoreInMemory(list: AppUser[]): void {
    this.users.set([...list]);
  }

  private async syncStaffToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(STAFF_SAVE_API, this.users(), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          'Could not save staff.json. Run npm run data-api in a second terminal (with ng serve).',
      };
    }
  }

  async commitStaffAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = await this.syncStaffToDisk();
    if (!s.ok) return s;
    await this.loadFromFile(true);
    return { ok: true };
  }

  nextStaffId(): string {
    let max = 0;
    for (const u of this.users()) {
      const m = /^usr-(\d+)$/i.exec(u.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `usr-${max + 1}`;
  }

  /** Add a staff row (in memory). Call `commitStaffAndReload` to persist. */
  addStaff(input: Omit<AppUser, 'id'>): { ok: true } | { ok: false; error: string } {
    if (!String(input.password ?? '').trim()) {
      return { ok: false, error: 'Password is required so the staff member can sign in.' };
    }
    const id = this.nextStaffId();
    const u = normalizeAppUser({ ...input, id, roles: (input.roles?.length ? input.roles : (['STAFF'] as AppRole[])) });
    if (!u) return { ok: false, error: 'Display name and email are required.' };
    if (this.users().some((x) => x.email === u.email)) {
      return { ok: false, error: 'A staff member with this email already exists.' };
    }
    this.users.update((list) => [...list, u]);
    return { ok: true };
  }

  /**
   * Update an existing row by `id`. If `input.password` is empty, the previous password is kept.
   */
  updateStaff(id: string, input: Omit<AppUser, 'id'>): { ok: true } | { ok: false; error: string } {
    const idx = this.users().findIndex((u) => u.id === id);
    if (idx < 0) return { ok: false, error: 'Staff member not found.' };
    const prev = this.users()[idx];
    const password = String(input.password ?? '').trim() || prev.password;
    if (!password) {
      return { ok: false, error: 'Set a sign-in password, or leave the field blank to keep the current one.' };
    }
    const u = normalizeAppUser({
      ...input,
      id,
      password,
      email: String(input.email ?? '').trim().toLowerCase(),
      displayName: String(input.displayName ?? '').trim(),
      cardNumber: String(input.cardNumber ?? '').trim(),
      roles: (input.roles?.length ? input.roles : prev.roles),
    });
    if (!u) return { ok: false, error: 'Display name and email are required.' };
    if (this.users().some((x) => x.id !== id && x.email === u.email)) {
      return { ok: false, error: 'Another staff member already uses this email.' };
    }
    this.users.update((list) => {
      const next = [...list];
      next[idx] = u;
      return sortUsers(next);
    });
    return { ok: true };
  }

  /** Remove a staff row by id (in memory). Call `commitStaffAndReload` to persist. */
  removeStaff(id: string): void {
    const trimmed = id.trim();
    this.users.update((list) => list.filter((u) => u.id !== trimmed));
  }

  exportStaffDownload(): void {
    const text = JSON.stringify(this.users(), null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = 'staff.json';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  replaceAllInMemory(list: AppUser[]): void {
    this.users.set(sortUsers(normalizeStaffList(list)));
  }

  parseStaffJson(text: string): { ok: true; data: AppUser[] } | { ok: false; error: string } {
    try {
      const data = JSON.parse(text) as unknown;
      const rows = normalizeStaffList(data);
      if (rows.length === 0) {
        return { ok: false, error: 'No valid staff rows (need id, displayName, email).' };
      }
      return { ok: true, data: rows };
    } catch {
      return { ok: false, error: 'Invalid JSON.' };
    }
  }
}
