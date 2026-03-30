import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { FeeStoreService, FEES_JSON_PATH } from '../data/fee-store.service';
import { FeeRecord, FEE_TYPES, FeeType } from '../data/fee.model';
import { FeeUsageStoreService, FEES_USAGE_JSON_PATH } from '../data/fee-usage-store.service';
import { FeeUsageRecord, FEE_USAGE_CURRENCY_DEFAULT } from '../data/fee-usage.model';

@Component({
  selector: 'app-fees-management',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fees-management.component.html',
})
export class FeesManagementComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private feeStore = inject(FeeStoreService);
  private feeUsageStore = inject(FeeUsageStoreService);

  user = this.auth.currentUser;
  fees = this.feeStore.fees;
  loaded = this.feeStore.loaded;
  feesLoadError = this.feeStore.loadError;

  usages = this.feeUsageStore.usages;
  usageLoaded = this.feeUsageStore.loaded;
  usagesLoadError = this.feeUsageStore.loadError;

  readonly feesJsonPath = FEES_JSON_PATH;
  readonly dataDirHint = 'public/data/fees.json';
  readonly feeTypes = FEE_TYPES;

  readonly feesUsageJsonPath = FEES_USAGE_JSON_PATH;
  readonly feesUsageDataDirHint = 'public/data/fees-usage.json';
  readonly usageCurrency = FEE_USAGE_CURRENCY_DEFAULT;

  actionMessage = '';
  addFormError = '';
  addSectionOpen = false;
  dataToolsOpen = false;
  feeListOpen = true;
  usageSectionOpen = false;
  usageListOpen = true;

  newFee = this.emptyNewFee();

  newUsage = this.emptyNewUsage();

  showFeeModal = false;
  feeModalId = '';
  feeModalDraft: Omit<FeeRecord, 'id'> = this.emptyModalDraft();
  feeModalError = '';

  showUsageModal = false;
  usageModalId = '';
  usageModalDraft: Omit<FeeUsageRecord, 'id'> = this.emptyUsageModalDraft();
  usageModalError = '';

  private emptyNewFee(): { date: string; type: FeeType; amount: number; currency: string } {
    return {
      date: this.todayISO(),
      type: FEE_TYPES[0],
      amount: 0,
      currency: 'GHS',
    };
  }

  private emptyModalDraft(): Omit<FeeRecord, 'id'> {
    return {
      date: this.todayISO(),
      type: FEE_TYPES[0],
      amount: 0,
      currency: 'GHS',
      addedByName: '',
      addedByEmail: '',
    };
  }

  private emptyNewUsage(): { date: string; type: FeeType; amount: number; currency: string } {
    return {
      date: this.todayISO(),
      type: FEE_TYPES[0],
      amount: 0,
      currency: this.usageCurrency,
    };
  }

  private emptyUsageModalDraft(): Omit<FeeUsageRecord, 'id'> {
    return {
      date: this.todayISO(),
      type: FEE_TYPES[0],
      amount: 0,
      currency: this.usageCurrency,
      usedByName: '',
      usedByEmail: '',
    };
  }

  private todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private snapshotFees(): FeeRecord[] {
    return [...this.feeStore.fees()];
  }

  private snapshotUsages(): FeeUsageRecord[] {
    return [...this.feeUsageStore.usages()];
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  addedByPreview(): { name: string; email: string } {
    return {
      name: this.user() ?? '—',
      email: this.auth.getSessionEmail() ?? '—',
    };
  }

  formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  async addFeeEntry(): Promise<void> {
    this.addFormError = '';
    this.actionMessage = '';
    const name = (this.user() ?? '').trim();
    const email = this.auth.getSessionEmail();
    if (!name || !email) {
      this.addFormError = 'Sign in is required to record who added the fee.';
      return;
    }
    const before = this.snapshotFees();
    const result = this.feeStore.addFee({
      date: this.newFee.date,
      type: this.newFee.type,
      amount: Number(this.newFee.amount) || 0,
      currency: (this.newFee.currency || 'GHS').trim().toUpperCase().slice(0, 3) || 'GHS',
      addedByName: name,
      addedByEmail: email,
    });
    if (!result.ok) {
      this.addFormError = result.error;
      return;
    }
    const commit = await this.feeStore.commitAndReload();
    if (!commit.ok) {
      this.feeStore.restoreInMemory(before);
      this.addFormError = commit.error;
      return;
    }
    this.newFee = this.emptyNewFee();
    this.actionMessage = 'Fee saved to public/data/fees.json.';
  }

  /**
   * Remaining available balance for a fee type & currency.
   * Usage entries deduct from the totals of fee entries.
   */
  remainingForType(type: FeeType, currency: string): number {
    const fees = this.feeStore.fees();
    const usages = this.feeUsageStore.usages();
    const totalFees = fees
      .filter((f) => f.type === type && f.currency === currency)
      .reduce((sum, f) => sum + f.amount, 0);
    const totalUsed = usages
      .filter((u) => u.type === type && u.currency === currency)
      .reduce((sum, u) => sum + u.amount, 0);
    return totalFees - totalUsed;
  }

  async addUsageEntry(): Promise<void> {
    this.addFormError = '';
    this.actionMessage = '';

    const name = (this.user() ?? '').trim();
    const email = this.auth.getSessionEmail();
    if (!name || !email) {
      this.addFormError = 'Sign in is required to record who used the fee.';
      return;
    }

    const amount = Number(this.newUsage.amount) || 0;
    if (!this.newUsage.date || !this.newUsage.type || amount <= 0) {
      this.addFormError = 'Provide a valid date, type, and a positive amount.';
      return;
    }

    const currency = (this.newUsage.currency || this.usageCurrency).trim().toUpperCase().slice(0, 3) || this.usageCurrency;
    const remaining = this.remainingForType(this.newUsage.type, currency);
    if (amount > remaining) {
      this.addFormError = `Not enough remaining balance. Available for ${this.newUsage.type} (${currency}): ${remaining.toFixed(2)}.`;
      return;
    }

    const before = this.snapshotUsages();
    const result = this.feeUsageStore.addUsage({
      date: this.newUsage.date,
      type: this.newUsage.type,
      amount,
      currency,
      usedByName: name,
      usedByEmail: email,
    });
    if (!result.ok) {
      this.addFormError = result.error;
      return;
    }

    const commit = await this.feeUsageStore.commitAndReload();
    if (!commit.ok) {
      this.feeUsageStore.restoreInMemory(before);
      this.addFormError = commit.error;
      return;
    }

    this.newUsage = this.emptyNewUsage();
    this.actionMessage = 'Fee usage saved to public/data/fees-usage.json.';
  }

  openUsageModal(u: FeeUsageRecord): void {
    this.usageModalId = u.id;
    this.usageModalDraft = {
      date: u.date,
      type: u.type,
      amount: u.amount,
      currency: u.currency,
      usedByName: u.usedByName,
      usedByEmail: u.usedByEmail,
    };
    this.usageModalError = '';
    this.showUsageModal = true;
  }

  closeUsageModal(): void {
    this.showUsageModal = false;
    this.usageModalId = '';
    this.usageModalError = '';
    this.usageModalDraft = this.emptyUsageModalDraft();
  }

  async saveUsageModal(): Promise<void> {
    this.usageModalError = '';
    this.actionMessage = '';

    const before = this.snapshotUsages();

    const currency = (this.usageModalDraft.currency || this.usageCurrency)
      .trim()
      .toUpperCase()
      .slice(0, 3) || this.usageCurrency;
    const amount = Number(this.usageModalDraft.amount) || 0;

    if (!this.usageModalDraft.date || !this.usageModalDraft.type || amount <= 0) {
      this.usageModalError = 'Provide a valid date, type, and a positive amount.';
      return;
    }

    // Available if we "remove" current record first.
    const totalFees = this.feeStore.fees()
      .filter((f) => f.type === this.usageModalDraft.type && f.currency === currency)
      .reduce((sum, f) => sum + f.amount, 0);
    const totalUsedExcludingCurrent =
      this.feeUsageStore.usages()
        .filter((x) => !(x.id === this.usageModalId))
        .filter((x) => x.type === this.usageModalDraft.type && x.currency === currency)
        .reduce((sum, x) => sum + x.amount, 0);

    const remaining = totalFees - totalUsedExcludingCurrent;
    if (amount > remaining) {
      this.usageModalError = `Not enough remaining balance. Available for ${this.usageModalDraft.type} (${currency}): ${remaining.toFixed(2)}.`;
      return;
    }

    const result = this.feeUsageStore.updateUsage(this.usageModalId, {
      ...this.usageModalDraft,
      currency,
      amount,
      usedByName: this.usageModalDraft.usedByName.trim(),
      usedByEmail: this.usageModalDraft.usedByEmail.trim().toLowerCase(),
    });
    if (!result.ok) {
      this.usageModalError = result.error;
      return;
    }

    const commit = await this.feeUsageStore.commitAndReload();
    if (!commit.ok) {
      this.feeUsageStore.restoreInMemory(before);
      this.usageModalError = commit.error;
      return;
    }

    this.actionMessage = 'Fee usage updated in public/data/fees-usage.json.';
    this.closeUsageModal();
  }

  async deleteUsage(u: FeeUsageRecord): Promise<void> {
    if (
      !window.confirm(
        `Delete fee usage ${u.id} (${u.type}, ${this.formatMoney(u.amount, u.currency)})?`,
      )
    ) {
      return;
    }
    this.actionMessage = '';
    const before = this.snapshotUsages();
    this.feeUsageStore.removeUsage(u.id);
    const commit = await this.feeUsageStore.commitAndReload();
    if (!commit.ok) {
      this.feeUsageStore.restoreInMemory(before);
      this.actionMessage = commit.error;
      return;
    }
    if (this.showUsageModal && this.usageModalId === u.id) {
      this.closeUsageModal();
    }
    this.actionMessage = 'Fee usage removed from public/data/fees-usage.json.';
  }

  async deleteUsageFromModal(): Promise<void> {
    const u = this.feeUsageStore.usages().find((x) => x.id === this.usageModalId);
    if (u) await this.deleteUsage(u);
  }

  exportUsages(): void {
    this.actionMessage = '';
    this.feeUsageStore.exportUsagesDownload();
    this.actionMessage = 'Download started (fees-usage.json).';
  }

  async reloadUsagesFile(): Promise<void> {
    this.actionMessage = '';
    try {
      await this.feeUsageStore.reloadFromFile();
      this.actionMessage = 'Reloaded from public/data/fees-usage.json.';
    } catch {
      this.actionMessage = 'Could not reload fees-usage.json.';
    }
  }

  openFeeModal(f: FeeRecord): void {
    this.feeModalId = f.id;
    this.feeModalDraft = {
      date: f.date,
      type: f.type,
      amount: f.amount,
      currency: f.currency,
      addedByName: f.addedByName,
      addedByEmail: f.addedByEmail,
    };
    this.feeModalError = '';
    this.showFeeModal = true;
  }

  closeFeeModal(): void {
    this.showFeeModal = false;
    this.feeModalId = '';
    this.feeModalError = '';
    this.feeModalDraft = this.emptyModalDraft();
  }

  async saveFeeModal(): Promise<void> {
    this.feeModalError = '';
    this.actionMessage = '';
    const before = this.snapshotFees();
    const result = this.feeStore.updateFee(this.feeModalId, {
      ...this.feeModalDraft,
      amount: Number(this.feeModalDraft.amount) || 0,
      currency: (this.feeModalDraft.currency || 'GHS').trim().toUpperCase().slice(0, 3) || 'GHS',
      addedByName: this.feeModalDraft.addedByName.trim(),
      addedByEmail: this.feeModalDraft.addedByEmail.trim().toLowerCase(),
    });
    if (!result.ok) {
      this.feeModalError = result.error;
      return;
    }
    const commit = await this.feeStore.commitAndReload();
    if (!commit.ok) {
      this.feeStore.restoreInMemory(before);
      this.feeModalError = commit.error;
      return;
    }
    this.actionMessage = 'Fee updated in public/data/fees.json.';
    this.closeFeeModal();
  }

  async deleteFee(f: FeeRecord): Promise<void> {
    if (!window.confirm(`Delete fee ${f.id} (${f.type}, ${this.formatMoney(f.amount, f.currency)})?`)) {
      return;
    }
    this.actionMessage = '';
    const before = this.snapshotFees();
    this.feeStore.removeFee(f.id);
    const commit = await this.feeStore.commitAndReload();
    if (!commit.ok) {
      this.feeStore.restoreInMemory(before);
      this.actionMessage = commit.error;
      return;
    }
    if (this.showFeeModal && this.feeModalId === f.id) {
      this.closeFeeModal();
    }
    this.actionMessage = 'Fee removed from public/data/fees.json.';
  }

  async deleteFeeFromModal(): Promise<void> {
    const f = this.feeStore.fees().find((x) => x.id === this.feeModalId);
    if (f) await this.deleteFee(f);
  }

  exportFees(): void {
    this.actionMessage = '';
    this.feeStore.exportFeesDownload();
    this.actionMessage = 'Download started (fees.json).';
  }

  async reloadFeesFile(): Promise<void> {
    this.actionMessage = '';
    try {
      await this.feeStore.reloadFromFile();
      this.actionMessage = 'Reloaded from public/data/fees.json.';
    } catch {
      this.actionMessage = 'Could not reload fees.json.';
    }
  }
}
