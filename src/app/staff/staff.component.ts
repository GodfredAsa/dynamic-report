import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AppUserStoreService, STAFF_JSON_PATH } from '../data/app-user-store.service';
import { APP_ROLES, AppRole, AppUser, STAFF_CARD_TYPES, STAFF_CATEGORIES } from '../data/app-user.model';

@Component({
  selector: 'app-staff',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff.component.html',
})
export class StaffComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private staffStore = inject(AppUserStoreService);

  user = this.auth.currentUser;
  staff = this.staffStore.users;
  loaded = this.staffStore.loaded;
  staffLoadError = this.staffStore.loadError;

  readonly staffJsonPath = STAFF_JSON_PATH;
  readonly dataDirHint = 'public/data/staff.json';
  readonly cardTypes = STAFF_CARD_TYPES;
  readonly staffCategories = STAFF_CATEGORIES;
  readonly appRoles = APP_ROLES;

  actionMessage = '';
  addFormError = '';
  /** Add-staff panel starts collapsed. */
  addSectionOpen = false;
  /** Download / import / reload panel starts collapsed. */
  dataToolsSectionOpen = false;
  /** Staff list table starts collapsed. */
  staffListSectionOpen = false;
  private importFile: File | null = null;

  showStaffModal = false;
  staffEditId = '';
  editStaff: Omit<AppUser, 'id'> = this.emptyNewStaff();
  editStaffError = '';

  newStaff: Omit<AppUser, 'id'> = this.emptyNewStaff();

  private emptyNewStaff(): Omit<AppUser, 'id'> {
    return {
      displayName: '',
      email: '',
      password: '',
      cardNumber: '',
      cardType: STAFF_CARD_TYPES[0],
      staffCategory: 'teaching',
      roles: ['STAFF'],
    };
  }

  staffCategoryLabel(c: string): string {
    return c === 'non-teaching' ? 'Non-teaching' : 'Teaching';
  }

  private snapshotStaff(): AppUser[] {
    return [...this.staffStore.users()];
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  openStaffModal(s: AppUser): void {
    this.staffEditId = s.id;
    this.editStaff = {
      displayName: s.displayName,
      email: s.email,
      password: '',
      cardNumber: s.cardNumber,
      cardType: s.cardType,
      staffCategory: s.staffCategory,
      roles: (s.roles?.length ? [...s.roles] : ['STAFF']),
    };
    this.editStaffError = '';
    this.showStaffModal = true;
  }

  toggleRole(role: AppRole, checked: boolean): void {
    const current = this.editStaff.roles ?? [];
    const next = checked ? [...current, role] : current.filter((r) => r !== role);
    this.editStaff.roles = [...new Set(next)];
    if (!this.editStaff.roles.length) this.editStaff.roles = ['STAFF'];
  }

  closeStaffModal(): void {
    this.showStaffModal = false;
    this.staffEditId = '';
    this.editStaffError = '';
    this.editStaff = this.emptyNewStaff();
  }

  async saveStaffEdit(): Promise<void> {
    this.editStaffError = '';
    this.actionMessage = '';
    const before = this.snapshotStaff();
    const result = this.staffStore.updateStaff(this.staffEditId, {
      ...this.editStaff,
      email: this.editStaff.email.trim().toLowerCase(),
      displayName: this.editStaff.displayName.trim(),
      cardNumber: this.editStaff.cardNumber.trim(),
      password: this.editStaff.password,
    });
    if (!result.ok) {
      this.editStaffError = result.error;
      return;
    }
    const commit = await this.staffStore.commitStaffAndReload();
    if (!commit.ok) {
      this.staffStore.restoreInMemory(before);
      this.editStaffError = commit.error;
      return;
    }
    this.actionMessage = 'Staff member updated and saved to public/data/staff.json.';
    this.closeStaffModal();
  }

  async addStaffMember(): Promise<void> {
    this.addFormError = '';
    this.actionMessage = '';
    const before = this.snapshotStaff();
    const result = this.staffStore.addStaff({
      ...this.newStaff,
      email: this.newStaff.email.trim().toLowerCase(),
      displayName: this.newStaff.displayName.trim(),
      password: this.newStaff.password,
      cardNumber: this.newStaff.cardNumber.trim(),
    });
    if (!result.ok) {
      this.addFormError = result.error;
      return;
    }
    const commit = await this.staffStore.commitStaffAndReload();
    if (!commit.ok) {
      this.staffStore.restoreInMemory(before);
      this.addFormError = commit.error;
      return;
    }
    this.newStaff = this.emptyNewStaff();
    this.actionMessage = 'Staff member added and saved to public/data/staff.json.';
  }

  exportStaff(): void {
    this.actionMessage = '';
    this.staffStore.exportStaffDownload();
    this.actionMessage = 'Download started (staff.json).';
  }

  async reloadFromBundledFile(): Promise<void> {
    this.actionMessage = '';
    try {
      await this.staffStore.reloadFromStaffFile();
      this.actionMessage = 'Reloaded from public/data/staff.json.';
    } catch {
      this.actionMessage = 'Could not load data/staff.json. Check that the file exists under public/data/.';
    }
  }

  onImportSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.importFile = input.files?.[0] ?? null;
  }

  async applyImport(): Promise<void> {
    this.actionMessage = '';
    if (!this.importFile) {
      this.actionMessage = 'Choose a staff.json file first.';
      return;
    }
    try {
      const text = await this.importFile.text();
      const parsed = this.staffStore.parseStaffJson(text);
      if (!parsed.ok) {
        this.actionMessage = parsed.error;
        return;
      }
      this.staffStore.replaceAllInMemory(parsed.data);
      this.actionMessage = `Loaded ${parsed.data.length} row(s) in memory. Download staff.json or use Add + save with data-api to persist.`;
    } catch {
      this.actionMessage = 'Could not read file.';
    }
  }
}
