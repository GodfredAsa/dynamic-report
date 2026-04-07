import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DailyFeedingSummary } from './daily-feeding.model';
import { normalizeDailyFeedingSummary } from './daily-feeding-normalize';

export const DAILY_FEEDING_JSON_PATH = '/data/daily-feeding.json';
export const DAILY_FEEDING_SAVE_API = '/api/daily-feeding';

@Injectable({ providedIn: 'root' })
export class DailyFeedingStoreService {
  private http = inject(HttpClient);

  readonly summary = signal<DailyFeedingSummary | null>(null);
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
    return bustCache ? `${DAILY_FEEDING_JSON_PATH}?t=${Date.now()}` : DAILY_FEEDING_JSON_PATH;
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const file = await firstValueFrom(this.http.get<unknown>(this.url(bustCache)));
      this.summary.set(normalizeDailyFeedingSummary(file));
      this.loaded.set(true);
      return;
    } catch {
      this.loadError.set('Could not load /data/daily-feeding.json');
    }
    this.summary.set(
      normalizeDailyFeedingSummary({
        dayLabel: 'Today',
        currency: 'GHS',
        totalAmount: 0,
      }),
    );
    this.loaded.set(true);
  }

  async reloadFromFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  private async syncToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = this.summary();
    if (!s) return { ok: false, error: 'No daily feeding summary in memory.' };
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(DAILY_FEEDING_SAVE_API, s, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not save daily-feeding.json. Run npm run data-api with ng serve.',
      };
    }
  }

  async commitAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const r = await this.syncToDisk();
    if (!r.ok) return r;
    await this.loadFromFile(true);
    return { ok: true };
  }

  setSummary(next: DailyFeedingSummary): void {
    this.summary.set(normalizeDailyFeedingSummary(next));
  }
}
