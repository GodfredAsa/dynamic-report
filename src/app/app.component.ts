import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MultiReportComponent } from './multi-report/multi-report.component';
import { SingleReportComponent } from './single-report/single-report.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, MultiReportComponent, SingleReportComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Terminal Report';
}
