import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FeeUsageRecord } from './fee-usage.model';
import { normalizeFeeUsageList, normalizeFeeUsageRecord } from './fee-usage-normalize';

export const FEES_USAGE_JSON_PATH = '/data/fees-usage.json';
export const FEES_USAGE_SAVE_API = '/api/fees-usage';

function sortUsages(list: FeeUsageRecord[]): FeeUsageRecord[] {
  return [...list].sort((a, b) => {
    const c = b.date.localeCompare(a.date);
    if (c !== 0) return c;
    return b.id.localeCompare(a.id);
  });
}

@Injectable({ providedIn: 'root' })
export class FeeUsageStoreService {
  private http = inject(HttpClient);
  private doc = inject(DOCUMENT);

  readonly usages = signal<FeeUsageRecord[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal('');

  private readonly initialLoad: Promise<void>;

  constructor() {
    this.initialLoad = this.loadFromFile(false);
  }

  async waitUntilLoaded(): Promise<void> {
    await this.initialLoad;
  }

  private url(bustCache: boolean): string {
    return bustCache ? `${FEES_USAGE_JSON_PATH}?t=${Date.now()}` : FEES_USAGE_JSON_PATH;
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const file = await firstValueFrom(this.http.get<unknown>(this.url(bustCache)));
      const rows = normalizeFeeUsageList(file);
      this.usages.set(sortUsages(rows));
      this.loaded.set(true);
      return;
    } catch {
      this.loadError.set('Could not load /data/fees-usage.json');
    }
    this.usages.set([]);
    this.loaded.set(true);
  }

  async reloadFromFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  restoreInMemory(list: FeeUsageRecord[]): void {
    this.usages.set([...list]);
  }

  private async syncToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(FEES_USAGE_SAVE_API, this.usages(), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not save fees-usage.json. Run npm run data-api with ng serve.',
      };
    }
  }

  async commitAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = await this.syncToDisk();
    if (!s.ok) return s;
    await this.loadFromFile(true);
    return { ok: true };
  }

  nextUsageId(): string {
    let max = 0;
    for (const u of this.usages()) {
      const m = /^usage-(\d+)$/i.exec(u.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `usage-${max + 1}`;
  }

  addUsage(input: Omit<FeeUsageRecord, 'id'>): { ok: true } | { ok: false; error: string } {
    const id = this.nextUsageId();
    const row = normalizeFeeUsageRecord({ ...input, id });
    if (!row) return { ok: false, error: 'Date, type, amount, and who used (name & email) are required.' };
    this.usages.update((list) => sortUsages([...list, row]));
    return { ok: true };
  }

  updateUsage(id: string, input: Omit<FeeUsageRecord, 'id'>): { ok: true } | { ok: false; error: string } {
    const trimmed = id.trim();
    const idx = this.usages().findIndex((u) => u.id === trimmed);
    if (idx < 0) return { ok: false, error: 'Usage record not found.' };
    const row = normalizeFeeUsageRecord({ ...input, id: trimmed });
    if (!row) return { ok: false, error: 'Invalid fee usage data.' };
    this.usages.update((list) => {
      const next = [...list];
      next[idx] = row;
      return sortUsages(next);
    });
    return { ok: true };
  }

  removeUsage(id: string): void {
    const trimmed = id.trim();
    this.usages.update((list) => list.filter((u) => u.id !== trimmed));
  }

  exportUsagesDownload(): void {
    const text = JSON.stringify(this.usages(), null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = 'fees-usage.json';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

