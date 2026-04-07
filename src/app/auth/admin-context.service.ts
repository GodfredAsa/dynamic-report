import { Injectable, signal } from '@angular/core';

/**
 * Marks that the user is currently operating inside the SETUP area.
 * We use this to ensure create/update/delete actions only run from SETUP.
 */
@Injectable({ providedIn: 'root' })
export class AdminContextService {
  /** True only while the Setup module is active. */
  readonly inSetup = signal(false);

  enterSetup(): void {
    this.inSetup.set(true);
  }

  leaveSetup(): void {
    this.inSetup.set(false);
  }
}

