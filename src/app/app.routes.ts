import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { ModulesComponent } from './modules/modules.component';
import { ReportsComponent } from './reports/reports.component';
import { StudentsComponent } from './students/students.component';
import { StaffComponent } from './staff/staff.component';
import { ClassesDepartmentsComponent } from './classes-departments/classes-departments.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { FeesManagementComponent } from './fees-management/fees-management.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: 'modules', component: ModulesComponent, canActivate: [authGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: 'students', component: StudentsComponent, canActivate: [authGuard] },
  { path: 'staff', component: StaffComponent, canActivate: [authGuard] },
  { path: 'classes', component: ClassesDepartmentsComponent, canActivate: [authGuard] },
  { path: 'fees', component: FeesManagementComponent, canActivate: [authGuard] },
  { path: 'statistics', component: StatisticsComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
