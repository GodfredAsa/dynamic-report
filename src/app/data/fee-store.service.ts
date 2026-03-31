import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FeeRecord, FeeType, FeeUse } from './fee.model';
import { normalizeFeeList, normalizeFeeRecord } from './fee-normalize';

export const FEES_JSON_PATH = '/data/fees.json';
export const FEES_SAVE_API = '/api/fees';

function sortFees(list: FeeRecord[]): FeeRecord[] {
  return [...list].sort((a, b) => {
    const c = b.date.localeCompare(a.date);
    if (c !== 0) return c;
    return b.id.localeCompare(a.id);
  });
}

@Injectable({ providedIn: 'root' })
export class FeeStoreService {
  private http = inject(HttpClient);
  private doc = inject(DOCUMENT);

  readonly fees = signal<FeeRecord[]>([]);
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
    return bustCache ? `${FEES_JSON_PATH}?t=${Date.now()}` : FEES_JSON_PATH;
  }

  async loadFromFile(bustCache: boolean): Promise<void> {
    this.loadError.set('');
    try {
      const file = await firstValueFrom(this.http.get<unknown>(this.url(bustCache)));
      const rows = normalizeFeeList(file);
      this.fees.set(sortFees(rows));
      this.loaded.set(true);
      return;
    } catch {
      this.loadError.set('Could not load /data/fees.json');
    }
    this.fees.set([]);
    this.loaded.set(true);
  }

  async reloadFromFile(): Promise<void> {
    await this.loadFromFile(true);
  }

  restoreInMemory(list: FeeRecord[]): void {
    this.fees.set([...list]);
  }

  private async syncToDisk(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ ok?: boolean }>(FEES_SAVE_API, this.fees(), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Could not save fees.json. Run npm run data-api with ng serve.',
      };
    }
  }

  async commitAndReload(): Promise<{ ok: true } | { ok: false; error: string }> {
    const s = await this.syncToDisk();
    if (!s.ok) return s;
    await this.loadFromFile(true);
    return { ok: true };
  }

  nextFeeId(): string {
    let max = 0;
    for (const f of this.fees()) {
      const m = /^fee-(\d+)$/i.exec(f.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `fee-${max + 1}`;
  }

  addFee(input: Omit<FeeRecord, 'id'>): { ok: true } | { ok: false; error: string } {
    const id = this.nextFeeId();
    const row = normalizeFeeRecord({ ...input, id });
    if (!row) return { ok: false, error: 'Date, type, amount, and who added (name & email) are required.' };
    this.fees.update((list) => sortFees([...list, row]));
    return { ok: true };
  }

  updateFee(id: string, input: Omit<FeeRecord, 'id'>): { ok: true } | { ok: false; error: string } {
    const trimmed = id.trim();
    const idx = this.fees().findIndex((f) => f.id === trimmed);
    if (idx < 0) return { ok: false, error: 'Fee record not found.' };
    const row = normalizeFeeRecord({ ...input, id: trimmed });
    if (!row) return { ok: false, error: 'Invalid fee data.' };
    this.fees.update((list) => {
      const next = [...list];
      next[idx] = row;
      return sortFees(next);
    });
    return { ok: true };
  }

  removeFee(id: string): void {
    const trimmed = id.trim();
    this.fees.update((list) => list.filter((f) => f.id !== trimmed));
  }

  addUsageToFeeType(
    type: FeeType,
    amountUsedRaw: number,
    purposeRaw: string,
  ): { ok: true } | { ok: false; error: string } {
    const amountUsed = Number(amountUsedRaw) || 0;
    const purpose = (purposeRaw ?? '').trim();
    if (amountUsed <= 0) {
      return { ok: false, error: 'Usage amount must be greater than zero.' };
    }
    const list = this.fees();
    const idx = list.findIndex((f) => f.type === type);
    if (idx < 0) {
      return { ok: false, error: 'No fee found for this type yet.' };
    }
    const target = list[idx];
    const existingUses: FeeUse[] = target.uses ? [...target.uses] : [];
    const totalUsed = existingUses.reduce((sum, u) => sum + (u.amountUsed || 0), 0);
    if (totalUsed + amountUsed > target.amount) {
      return {
        ok: false,
        error: 'Usage exceeds the total amount recorded for this fee type.',
      };
    }
    const nextUses: FeeUse[] = [
      ...existingUses,
      {
        amountUsed,
        purpose,
      },
    ];
    const updated: FeeRecord = {
      ...target,
      uses: nextUses,
    };
    this.fees.update((all) => {
      const copy = [...all];
      copy[idx] = updated;
      return sortFees(copy);
    });
    return { ok: true };
  }

  exportFeesDownload(): void {
    const text = JSON.stringify(this.fees(), null, 2);
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = 'fees.json';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
