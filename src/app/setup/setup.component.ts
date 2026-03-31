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

  user = this.auth.currentUser;

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
}

