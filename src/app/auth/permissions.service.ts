import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AppUserStoreService } from '../data/app-user-store.service';
import { AppRole } from '../data/app-user.model';
import { AdminContextService } from './admin-context.service';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private auth = inject(AuthService);
  private staffStore = inject(AppUserStoreService);
  private adminCtx = inject(AdminContextService);

  /** Current user's roles (empty if not resolved yet). */
  readonly roles = computed<AppRole[]>(() => {
    const email = this.auth.getSessionEmail();
    if (!email) return [];
    const u = this.staffStore.users().find((x) => x.email === email);
    return u?.roles ?? [];
  });

  /** "All privileges" role. */
  readonly isAdmin = computed<boolean>(() => this.roles().includes('ADMIN'));

  /** Write actions (add/edit/delete) require admin and must be done from SETUP. */
  readonly canWrite = computed<boolean>(() => this.isAdmin() && this.adminCtx.inSetup());
}

