import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminContextService } from '../auth/admin-context.service';
import { PermissionsService } from '../auth/permissions.service';
import { TermFeesStoreService } from '../data/term-fees-store.service';
import { TermFeesSummary } from '../data/term-fees.model';

@Component({
  selector: 'app-term',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './term.component.html',
})
export class TermComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private termStore = inject(TermFeesStoreService);
  readonly perms = inject(PermissionsService);
  readonly adminCtx = inject(AdminContextService);

  user = this.auth.currentUser;
  summary = this.termStore.summary;
  loadError = this.termStore.loadError;
  loaded = this.termStore.loaded;

  draftTermLabel = '';
  draftCurrency = 'GHS';
  draftStartDate = '';
  draftEndDate = '';
  computedWeeks = 0;
  message = '';

  constructor() {
    void this.initDraftFromStore();
  }

  private async initDraftFromStore(): Promise<void> {
    await this.termStore.waitUntilLoaded();
    this.applyFromSummary();
  }

  applyFromSummary(): void {
    const s = this.termStore.summary();
    if (!s) return;
    this.draftTermLabel = s.termLabel;
    this.draftCurrency = s.currency;
    this.draftStartDate = s.startDate ?? '';
    this.draftEndDate = s.endDate ?? '';
    this.computedWeeks = s.weeks ?? 0;
    this.message = '';
  }

  recomputeWeeks(): void {
    const start = this.draftStartDate?.trim();
    const end = this.draftEndDate?.trim();
    if (!start || !end) {
      this.computedWeeks = 0;
      return;
    }
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
      this.computedWeeks = 0;
      return;
    }
    const diffMs = e.getTime() - s.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    this.computedWeeks = Math.max(0, Math.round(diffMs / weekMs));
  }

  private buildSummary(): TermFeesSummary {
    const current = this.termStore.summary();
    const termLabel = this.draftTermLabel.trim() || 'Current term';
    const currency = this.draftCurrency.trim() || (current?.currency ?? 'GHS');
    const startDate = this.draftStartDate.trim();
    const endDate = this.draftEndDate.trim();
    this.recomputeWeeks();
    return {
      termLabel,
      currency,
      totalPaid: current?.totalPaid ?? 0,
      startDate,
      endDate,
      weeks: this.computedWeeks,
    };
  }

  async saveTermSettings(): Promise<void> {
    if (!this.perms.canWrite()) {
      this.message = 'View-only access: you cannot change term settings.';
      return;
    }
    this.message = '';
    const next = this.buildSummary();
    this.termStore.setSummary(next);
    const res = await this.termStore.commitAndReload();
    if (!res.ok) {
      this.message = res.error;
      return;
    }
    this.message = 'Term settings saved to public/data/term-fees.json.';
    this.applyFromSummary();
  }

  async reloadFromFile(): Promise<void> {
    this.message = '';
    await this.termStore.reloadFromFile();
    this.applyFromSummary();
    this.message = 'Reloaded from public/data/term-fees.json.';
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

