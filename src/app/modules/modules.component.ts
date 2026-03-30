import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export interface ModuleCard {
  title: string;
  description: string;
  iconClass: string;
  route: string;
}

@Component({
  selector: 'app-modules',
  imports: [CommonModule, RouterLink],
  templateUrl: './modules.component.html',
})
export class ModulesComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.currentUser;

  readonly moduleCards: ModuleCard[] = [
    {
      title: 'Reports',
      description:
        'Build print-ready terminal reports: single-student forms or bulk CSV with preview and PDF.',
      iconClass: 'fa-solid fa-file-lines',
      route: '/reports',
    },
    {
      title: 'Students',
      description:
        'Add and edit learners with guardian contact; assign students to class groups; data in students.json and departments.json.',
      iconClass: 'fa-solid fa-user-graduate',
      route: '/students',
    },
    {
      title: 'Staff',
      description:
        'Manage teachers and school staff, roles, and how they connect to classes and logins.',
      iconClass: 'fa-solid fa-chalkboard-user',
      route: '/staff',
    },
    {
      title: 'Classes & departments',
      description:
        'Create departments and class groups (forms, sections) so teachers and reports stay organized.',
      iconClass: 'fa-solid fa-school',
      route: '/classes',
    },
    {
      title: 'Fees management',
      description:
        'Track fee schedules, balances, and payments; connect amounts to students, classes, and reporting terms.',
      iconClass: 'fa-solid fa-file-invoice-dollar',
      route: '/fees',
    },
    {
      title: 'Statistics & performance',
      description:
        'View school-wide and class-level analytics: grade averages, distributions, and progress over time.',
      iconClass: 'fa-solid fa-chart-line',
      route: '/statistics',
    },
  ];

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
