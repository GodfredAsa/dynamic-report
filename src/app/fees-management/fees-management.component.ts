import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { FeeStoreService, FEES_JSON_PATH } from '../data/fee-store.service';
import { FeeRecord, FEE_TYPES, FeeType } from '../data/fee.model';

@Component({
  selector: 'app-fees-management',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fees-management.component.html',
})
export class FeesManagementComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private feeStore = inject(FeeStoreService);

  user = this.auth.currentUser;
  fees = this.feeStore.fees;
  loaded = this.feeStore.loaded;
  feesLoadError = this.feeStore.loadError;

  readonly feesJsonPath = FEES_JSON_PATH;
  readonly dataDirHint = 'public/data/fees.json';
  readonly feeTypes = FEE_TYPES;

  actionMessage = '';
  addFormError = '';
  addSectionOpen = false;
  useSectionOpen = false;
  dataToolsOpen = false;
  feeListOpen = false;

  useFormError = '';
  useAmount = 0;
  useType: FeeType = FEE_TYPES[0];
  usePurpose = '';

  newFee = this.emptyNewFee();

  totalsSectionOpen = false;

  showFeeModal = false;
  feeModalId = '';
  feeModalDraft: Omit<FeeRecord, 'id'> = this.emptyModalDraft();
  feeModalError = '';

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

  private todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private snapshotFees(): FeeRecord[] {
    return [...this.feeStore.fees()];
  }

  private resetUseForm(): void {
    this.useAmount = 0;
    this.useType = FEE_TYPES[0];
    this.usePurpose = '';
    this.useFormError = '';
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

  totalsByType(): { type: FeeType; currency: string; total: number; used: number }[] {
    const map = new Map<string, { type: FeeType; currency: string; total: number; used: number }>();
    for (const f of this.fees()) {
      const key = `${f.type}::${f.currency}`;
      const row = map.get(key) ?? { type: f.type, currency: f.currency, total: 0, used: 0 };
      row.total += Number(f.amount) || 0;
      if (Array.isArray(f.uses)) {
        for (const u of f.uses) row.used += Number(u.amountUsed) || 0;
      }
      map.set(key, row);
    }
    const out = [...map.values()];
    out.sort((a, b) => a.type.localeCompare(b.type) || a.currency.localeCompare(b.currency));
    return out;
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

  async useFee(): Promise<void> {
    this.useFormError = '';
    this.actionMessage = '';
    const before = this.snapshotFees();
    const result = this.feeStore.addUsageToFeeType(this.useType, this.useAmount, this.usePurpose);
    if (!result.ok) {
      this.useFormError = result.error;
      return;
    }
    const commit = await this.feeStore.commitAndReload();
    if (!commit.ok) {
      this.feeStore.restoreInMemory(before);
      this.useFormError = commit.error;
      return;
    }
    this.resetUseForm();
    this.actionMessage = 'Fee usage saved to public/data/fees.json.';
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
