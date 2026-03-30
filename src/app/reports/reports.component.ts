import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MultiReportComponent } from '../multi-report/multi-report.component';
import { BatchReportComponent } from '../batch-report/batch-report.component';
import { SingleReportComponent } from '../single-report/single-report.component';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-reports',
  imports: [
    CommonModule,
    RouterLink,
    MultiReportComponent,
    BatchReportComponent,
    SingleReportComponent,
  ],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.currentUser;

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
