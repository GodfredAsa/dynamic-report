import { Routes } from '@angular/router';
import { authGuard, loginGuard, roleGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { ModulesComponent } from './modules/modules.component';
import { ReportsComponent } from './reports/reports.component';
import { StudentsComponent } from './students/students.component';
import { StaffComponent } from './staff/staff.component';
import { ClassesDepartmentsComponent } from './classes-departments/classes-departments.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { FeesManagementComponent } from './fees-management/fees-management.component';
import { TermComponent } from './term/term.component';
import { SetupComponent } from './setup/setup.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: 'modules', component: ModulesComponent, canActivate: [authGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard, roleGuard('REPORTS')] },
  { path: 'students', component: StudentsComponent, canActivate: [authGuard, roleGuard('STUDENTS')] },
  { path: 'staff', component: StaffComponent, canActivate: [authGuard, roleGuard('ADMIN')] },
  { path: 'classes', component: ClassesDepartmentsComponent, canActivate: [authGuard, roleGuard('CLASSES')] },
  { path: 'fees', component: FeesManagementComponent, canActivate: [authGuard, roleGuard('FEES')] },
  { path: 'term', component: TermComponent, canActivate: [authGuard, roleGuard('TERM')] },
  { path: 'statistics', component: StatisticsComponent, canActivate: [authGuard, roleGuard('STATISTICS')] },
  { path: 'setup', component: SetupComponent, canActivate: [authGuard, roleGuard('ADMIN')] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
