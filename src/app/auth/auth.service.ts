import { Injectable, inject, signal } from '@angular/core';
import { AppUserStoreService } from '../data/app-user-store.service';

const SESSION_KEY = 'school-report-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private staffStore = inject(AppUserStoreService);

  /** Display name when resolved; may briefly show email from session while staff loads. */
  readonly currentUser = signal<string | null>(null);

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const email = sessionStorage.getItem(SESSION_KEY);
      if (email?.trim()) this.currentUser.set(email.trim());
    } catch {
      /* ignore */
    }
    void this.staffStore.waitUntilLoaded().then(() => {
      try {
        const email = sessionStorage.getItem(SESSION_KEY);
        if (!email?.trim()) {
          this.currentUser.set(null);
          return;
        }
        const norm = email.trim().toLowerCase();
        const u = this.staffStore.users().find((x) => x.email === norm);
        if (u) {
          this.currentUser.set(u.displayName);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          this.currentUser.set(null);
        }
      } catch {
        this.currentUser.set(null);
      }
    });
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  /** Email from the active session (same value stored at login). */
  getSessionEmail(): string | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw?.trim() ? raw.trim().toLowerCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * Validates email + password against rows in `public/data/staff.json` (via `AppUserStoreService`).
   */
  async login(username: string, password: string): Promise<boolean> {
    await this.staffStore.waitUntilLoaded();
    const email = username.trim().toLowerCase();
    const member = this.staffStore.users().find((u) => u.email === email);
    if (!member?.password || member.password !== password) {
      return false;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, member.email);
    } catch {
      /* ignore */
    }
    this.currentUser.set(member.displayName);
    return true;
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.currentUser.set(null);
  }
}
