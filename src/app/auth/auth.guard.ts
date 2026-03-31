import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AppUserStoreService } from '../data/app-user-store.service';
import { AppRole } from '../data/app-user.model';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const roleGuard = (role: AppRole): CanActivateFn => {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const staffStore = inject(AppUserStoreService);
    if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
    await staffStore.waitUntilLoaded();
    const email = auth.getSessionEmail();
    if (!email) return router.createUrlTree(['/login']);
    const u = staffStore.users().find((x) => x.email === email);
    const roles = u?.roles ?? [];
    if (roles.includes(role)) return true;
    return router.createUrlTree(['/modules']);
  };
};

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return router.createUrlTree(['/modules']);
  return true;
};
