import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TermFeesSummary } from './term-fees.model';
import { normalizeTermFeesSummary } from './term-fees-normalize';

export const TERM_FEES_JSON_PATH = '/data/term-fees.json';
export const TERM_FEES_SAVE_API = '/api/term-fees';

@Injectable({ providedIn: 'root' })
export class TermFeesStoreService {
  private http = inject(HttpClient);

  readonly summary = signal<TermFeesSummary | null>(null);
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
    return bustCache ? `${TERM_FEES_JSON_PATH}?t=${Date.now()}` : TERM_FEES_JSON_PATH;
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const file = await firstValueFrom(this.http.get<unknown>(this.url(bustCache)));
      this.summary.set(normalizeTermFeesSummary(file));
      this.loaded.set(true);
      return;
    } catch {
      this.loadError.set('Could not load /data/term-fees.json');
    }
    this.summary.set(
      normalizeTermFeesSummary({
        termLabel: 'Current term',
        currency: 'GHS',
        totalPaid: 0,
      }),
    );
    this.loaded.set(true);
  }

  async reloadFromFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  private async syncToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = this.summary();
    if (!s) return { ok: false, error: 'No fee summary in memory.' };
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(TERM_FEES_SAVE_API, s, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not save term-fees.json. Run npm run data-api with ng serve.',
      };
    }
  }

  async commitAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const r = await this.syncToDisk();
    if (!r.ok) return r;
    await this.loadFromFile(true);
    return { ok: true };
  }

  /** Replace in-memory summary (e.g. after edit). */
  setSummary(next: TermFeesSummary): void {
    this.summary.set(normalizeTermFeesSummary(next));
  }
}
