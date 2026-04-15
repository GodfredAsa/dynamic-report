import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ReportFormData,
  ReportService,
  SubjectEntry,
} from '../report.service';
import { DepartmentStoreService } from '../data/department-store.service';
import { Department, DepartmentClass } from '../data/department.model';
import { AppUserStoreService } from '../data/app-user-store.service';
import { AppUser } from '../data/app-user.model';

export interface SubjectLine {
  name: string;
  exam: string;
  classwork: string;
  grade: string;
  remarks: string;
}

@Component({
  selector: 'app-single-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './single-report.component.html',
})
export class SingleReportComponent implements AfterViewChecked {
  private report = inject(ReportService);
  private sanitizer = inject(DomSanitizer);
  private doc = inject(DOCUMENT);
  private departmentStore = inject(DepartmentStoreService);
  private staffStore = inject(AppUserStoreService);

  /** Collapsible section (header always visible). */
  singleSectionOpen = false;

  form: ReportFormData = this.report.emptyForm();
  subjects: SubjectLine[] = [this.emptySubject()];

  departments = this.departmentStore.departments;

  sortedDepartments(): Department[] {
    return [...this.departmentStore.departments()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  teachingStaff(): AppUser[] {
    return this.staffStore
      .users()
      .filter((u) => u.staffCategory === 'teaching')
      .slice()
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
      );
  }

  classesForSelectedDepartment(): DepartmentClass[] {
    const deptName = String(this.form.department ?? '').trim();
    if (!deptName) {
      return this.allClasses();
    }
    const d = this.departmentStore.departments().find((x) => x.name === deptName);
    return (d?.classes ?? []).slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  allClasses(): DepartmentClass[] {
    const all = this.departmentStore.departments().flatMap((d) => d.classes ?? []);
    return all.slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  reportHtml: SafeHtml | null = null;
  showReportModal = false;
  private watermarkApplied = false;

  @ViewChild('reportHost') reportHost?: ElementRef<HTMLElement>;

  private emptySubject(): SubjectLine {
    return { name: '', exam: '', classwork: '', grade: '', remarks: '' };
  }

  addSubject(): void {
    this.subjects.push(this.emptySubject());
  }

  removeSubject(i: number): void {
    if (this.subjects.length > 1) {
      this.subjects.splice(i, 1);
    }
  }

  onScoreInput(i: number, field: 'exam' | 'class'): void {
    const s = this.subjects[i];
    const { exam, classwork } = this.report.enforceLimits(s.exam, s.classwork, field);
    s.exam = exam;
    s.classwork = classwork;
    this.syncGradeRemarks(i);
  }

  syncGradeRemarks(i: number): void {
    const s = this.subjects[i];
    const ex = parseFloat(s.exam) || 0;
    const cw = parseFloat(s.classwork) || 0;
    if (ex === 0 && cw === 0) {
      s.grade = '';
      s.remarks = '';
      return;
    }
    const total = Math.min(this.report.TOTAL_MAX, ex + cw);
    s.grade = this.report.gradeFromPercentage(total);
    s.remarks = this.report.gradeToRemark(s.grade);
  }

  sumLine(i: number): string {
    const s = this.subjects[i];
    return this.report.sumDisplay(s.exam, s.classwork);
  }

  private getFormWithTotals(): ReportFormData {
    const balance = parseFloat(this.form.feesBalance) || 0;
    const nextTerm = parseFloat(this.form.feesNextTerm) || 0;
    return {
      ...this.form,
      totalDue: String(balance + nextTerm),
    };
  }

  private getSubjectsData(): SubjectEntry[] {
    return this.subjects
      .map((s) =>
        this.report.computeSubjectFromScores(
          s.name,
          parseFloat(s.exam) || 0,
          parseFloat(s.classwork) || 0,
          s.grade,
          s.remarks,
        ),
      )
      .filter((x): x is SubjectEntry => x !== null);
  }

  private validateRequired(): string[] {
    const ids: { key: keyof ReportFormData; label: string }[] = [
      { key: 'department', label: 'Department' },
      { key: 'studentName', label: 'Student name' },
      { key: 'reportYear', label: 'Year' },
      { key: 'termSession', label: 'Term' },
      { key: 'reportClass', label: 'Form/Class' },
      { key: 'reportDate', label: 'Report date' },
      { key: 'classTeacher', label: 'Class teacher' },
      { key: 'feesBalance', label: 'Fees balance' },
      { key: 'feesNextTerm', label: 'Fees for next term' },
    ];
    const missing: string[] = [];
    for (const { key, label } of ids) {
      const v = this.form[key];
      if (v === undefined || v === null || !String(v).trim()) {
        missing.push(label);
      }
    }
    return missing;
  }

  generateReport(): void {
    const missing = this.validateRequired();
    if (missing.length > 0) {
      window.alert(
        'Please fill all required fields: ' +
          missing.slice(0, 5).join(', ') +
          (missing.length > 5 ? ' ...' : ''),
      );
      return;
    }
    const subjects = this.getSubjectsData();
    if (subjects.length === 0) {
      window.alert('Add at least one subject with an exam or class score.');
      return;
    }
    const fd = this.getFormWithTotals();
    const html = this.report.buildTerminalReport(subjects, fd);
    this.reportHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    this.showReportModal = true;
    this.watermarkApplied = false;
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.reportHtml = null;
    this.watermarkApplied = false;
  }

  ngAfterViewChecked(): void {
    if (!this.showReportModal || this.watermarkApplied || !this.reportHost) {
      return;
    }
    const el = this.reportHost.nativeElement.querySelector(
      '.report-watermark:not(.no-bg-image)',
    ) as HTMLElement | null;
    if (el) {
      el.style.backgroundImage = `url("${this.report.watermarkAssetUrl.replace(/"/g, '\\"')}")`;
      this.watermarkApplied = true;
    }
  }

  printModalReport(): void {
    const form = this.getFormWithTotals();
    const studentName = this.report.sanitizeFilenamePart(form.studentName);
    const reportClass = this.report.sanitizeFilenamePart(form.reportClass);
    const termSession = this.report.sanitizeFilenamePart(form.termSession);
    const date =
      form.reportDate && form.reportDate.trim()
        ? form.reportDate.trim()
        : new Date().toISOString().slice(0, 10);
    const printTitle = `${studentName}_${reportClass}_${termSession}_${date}`;
    const previousTitle = this.doc.title;
    this.doc.title = printTitle;
    this.doc.defaultView?.print();
    this.doc.defaultView!.onafterprint = () => {
      this.doc.title = previousTitle;
      this.doc.defaultView!.onafterprint = null;
    };
  }
}
