import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminContextService } from '../auth/admin-context.service';
import { StaffComponent } from '../staff/staff.component';
import { ClassesDepartmentsComponent } from '../classes-departments/classes-departments.component';
import { StudentsComponent } from '../students/students.component';
import { FeesManagementComponent } from '../fees-management/fees-management.component';
import { TermComponent } from '../term/term.component';
import { FeeStoreService } from '../data/fee-store.service';
import { FeeUsageStoreService } from '../data/fee-usage-store.service';

@Component({
  selector: 'app-setup',
  imports: [
    CommonModule,
    RouterLink,
    StaffComponent,
    ClassesDepartmentsComponent,
    StudentsComponent,
    FeesManagementComponent,
    TermComponent,
  ],
  templateUrl: './setup.component.html',
})
export class SetupComponent implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private adminCtx = inject(AdminContextService);
  private feeStore = inject(FeeStoreService);
  private feeUsageStore = inject(FeeUsageStoreService);

  user = this.auth.currentUser;
  clearFeesMessage = '';

  constructor() {
    this.adminCtx.enterSetup();
  }

  ngOnDestroy(): void {
    this.adminCtx.leaveSetup();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  async clearFeesAndUsage(): Promise<void> {
    this.clearFeesMessage = '';
    if (!window.confirm('This will permanently clear fees.json and fees-usage.json. Continue?')) return;
    const beforeFees = [...this.feeStore.fees()];
    const beforeUsages = [...this.feeUsageStore.usages()];
    this.feeStore.restoreInMemory([]);
    this.feeUsageStore.restoreInMemory([]);
    const c1 = await this.feeStore.commitAndReload();
    const c2 = await this.feeUsageStore.commitAndReload();
    if (!c1.ok || !c2.ok) {
      this.feeStore.restoreInMemory(beforeFees);
      this.feeUsageStore.restoreInMemory(beforeUsages);
      this.clearFeesMessage = (!c1.ok ? c1.error : c2.ok ? '' : c2.error) || 'Could not clear fees data.';
      return;
    }
    this.clearFeesMessage = 'Cleared fees.json and fees-usage.json.';
  }
}

