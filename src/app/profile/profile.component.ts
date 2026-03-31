import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PermissionsService } from '../auth/permissions.service';
import { AppUserStoreService } from '../data/app-user-store.service';
import { AppUser, STAFF_CARD_TYPES, STAFF_CATEGORIES } from '../data/app-user.model';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private staffStore = inject(AppUserStoreService);
  readonly perms = inject(PermissionsService);

  user = this.auth.currentUser;
  loaded = this.staffStore.loaded;
  loadError = this.staffStore.loadError;

  readonly cardTypes = STAFF_CARD_TYPES;
  readonly staffCategories = STAFF_CATEGORIES;

  message = '';
  error = '';

  /** Draft fields for editing self. */
  draftDisplayName = '';
  draftCardNumber = '';
  draftCardType = STAFF_CARD_TYPES[0];
  draftStaffCategory: AppUser['staffCategory'] = 'teaching';
  draftPassword = '';

  constructor() {
    void this.initDraft();
  }

  genderIcon(g: unknown): { iconClass: string; label: string } {
    const s = String(g ?? '').trim().toLowerCase();
    if (s === 'female') return { iconClass: 'fa-solid fa-person-dress text-pink-400', label: 'Female' };
    return { iconClass: 'fa-solid fa-person text-sky-400', label: 'Male' };
  }

  private async initDraft(): Promise<void> {
    await this.staffStore.waitUntilLoaded();
    this.resetDraftFromCurrent();
  }

  me(): AppUser | undefined {
    const email = this.auth.getSessionEmail();
    if (!email) return undefined;
    return this.staffStore.users().find((u) => u.email === email);
  }

  resetDraftFromCurrent(): void {
    const me = this.me();
    if (!me) return;
    this.draftDisplayName = me.displayName;
    this.draftCardNumber = me.cardNumber ?? '';
    this.draftCardType = (me.cardType as any) ?? STAFF_CARD_TYPES[0];
    this.draftStaffCategory = me.staffCategory;
    this.draftPassword = '';
    this.message = '';
    this.error = '';
  }

  async saveProfile(): Promise<void> {
    this.message = '';
    this.error = '';
    const me = this.me();
    if (!me) {
      this.error = 'Could not resolve your staff record. Please sign in again.';
      return;
    }
    if (!this.perms.canWrite()) {
      this.error = 'View-only access: profile updates are only allowed inside SETUP for admins.';
      return;
    }

    const before = [...this.staffStore.users()];
    const res = this.staffStore.updateStaff(me.id, {
      displayName: this.draftDisplayName.trim(),
      email: me.email, // email stays the login identifier
      password: this.draftPassword,
      cardNumber: this.draftCardNumber.trim(),
      cardType: this.draftCardType,
      staffCategory: this.draftStaffCategory,
      roles: me.roles,
    });
    if (!res.ok) {
      this.error = res.error;
      return;
    }
    const commit = await this.staffStore.commitStaffAndReload();
    if (!commit.ok) {
      this.staffStore.restoreInMemory(before);
      this.error = commit.error;
      return;
    }
    this.message = 'Profile updated and saved to public/data/staff.json.';
    this.resetDraftFromCurrent();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

