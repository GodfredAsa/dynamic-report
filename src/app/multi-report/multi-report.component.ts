import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvReportGroup, ReportService } from '../report.service';

@Component({
  selector: 'app-multi-report',
  imports: [CommonModule],
  templateUrl: './multi-report.component.html',
})
export class MultiReportComponent {
  private report = inject(ReportService);

  csvStatus = '';
  csvGroups: CsvReportGroup[] = [];
  private csvFile: File | null = null;

  downloadDataTemplate(): void {
    this.report.downloadCsvTemplateHeaderOnly();
  }

  openTemplateGuide(): void {
    this.report.openTemplateGuide();
  }

  onCsvSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.csvFile = input.files && input.files[0] ? input.files[0] : null;
  }

  async loadCsvPreview(): Promise<void> {
    if (!this.csvFile) {
      this.csvStatus = 'Please choose a CSV file first.';
      return;
    }
    this.csvStatus = `Reading ${this.csvFile.name}...`;
    try {
      const text = await this.csvFile.text();
      const rows = this.report.parseCsvToRows(text);
      if (rows.length === 0) {
        this.csvStatus = 'CSV is empty or missing rows.';
        this.csvGroups = [];
        return;
      }
      this.csvGroups = this.report.groupCsvReports(rows);
      if (this.csvGroups.length === 0) {
        this.csvStatus = 'No valid reports found (check reportId and subject scores).';
        return;
      }
      this.csvStatus = `Found ${this.csvGroups.length} report(s).`;
    } catch {
      this.csvStatus = 'Failed to load CSV. Check formatting and headers.';
      this.csvGroups = [];
    }
  }

  printCsvReport(group: CsvReportGroup): void {
    this.report.printReportInNewWindow(group.subjects, group.meta, group.id);
  }
}
