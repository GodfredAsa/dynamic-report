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
import { DepartmentStoreService } from '../data/department-store.service';
import { Department, DepartmentClass } from '../data/department.model';
import { ReportFormData, ReportService, SubjectEntry } from '../report.service';

export interface BatchSubjectLine {
  name: string;
  exam: string;
  classwork: string;
  grade: string;
  remarks: string;
}

/** Shared across all pupils in the batch (entered once). */
export interface BatchReportGeneral {
  department: string;
  /** Class group name from the selected department’s `classes` list (same for all pupils). */
  reportClass: string;
  schoolAddress: string;
  reportYear: string;
  termSession: string;
  reportDate: string;
  vacationDate: string;
  classTeacher: string;
  headteacherRemarks: string;
}

/** Per-pupil fields merged with {@link BatchReportGeneral} for each print. */
export interface BatchPupilDraft {
  studentName: string;
  attendance: string;
  expectedAttendance: string;
  classTeacherRemarks: string;
  feesBalance: string;
  feesNextTerm: string;
  subjects: BatchSubjectLine[];
}

@Component({
  selector: 'app-batch-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-report.component.html',
})
export class BatchReportComponent implements AfterViewChecked {
  private report = inject(ReportService);
  private sanitizer = inject(DomSanitizer);
  private doc = inject(DOCUMENT);
  private departmentStore = inject(DepartmentStoreService);

  readonly maxPupils = 40;
  readonly maxSubjects = 20;

  /** From `public/data/departments.json`. */
  departments = this.departmentStore.departments;

  batchSectionOpen = false;

  pupilCountInput = 3;
  subjectCountInput = 5;
  batchMessage = '';
  pupils: BatchPupilDraft[] = [];

  general: BatchReportGeneral = this.emptyGeneral();

  /** Preview modal */
  showReportModal = false;
  reportHtml: SafeHtml | null = null;
  private watermarkApplied = false;
  previewPupilLabel = '';

  @ViewChild('reportHost') reportHost?: ElementRef<HTMLElement>;

  private emptyGeneral(): BatchReportGeneral {
    return {
      department: '',
      reportClass: '',
      schoolAddress: '',
      reportYear: '',
      termSession: '',
      reportDate: '',
      vacationDate: '',
      classTeacher: '',
      headteacherRemarks: '',
    };
  }

  sortedDepartments(): Department[] {
    return [...this.departmentStore.departments()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  /** Department row matching the general form’s selected department name. */
  selectedDepartment(): Department | undefined {
    const name = this.general.department.trim();
    if (!name) return undefined;
    return this.departmentStore.departments().find(
      (d) => d.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  }

  /** Class groups for the selected department (`departments.json` → `classes`). */
  classesForSelectedDepartment(): DepartmentClass[] {
    return this.selectedDepartment()?.classes ?? [];
  }

  onGeneralDepartmentChange(): void {
    this.general.reportClass = '';
  }

  private emptySubject(): BatchSubjectLine {
    return { name: '', exam: '', classwork: '', grade: '', remarks: '' };
  }

  private emptyPupilDraft(subjectCount: number): BatchPupilDraft {
    return {
      studentName: '',
      attendance: '',
      expectedAttendance: '',
      classTeacherRemarks: '',
      feesBalance: '',
      feesNextTerm: '',
      subjects: Array.from({ length: subjectCount }, () => this.emptySubject()),
    };
  }

  generateFormGrid(): void {
    this.batchMessage = '';
    const n = Math.min(
      Math.max(1, Math.floor(Number(this.pupilCountInput)) || 1),
      this.maxPupils,
    );
    const m = Math.min(
      Math.max(1, Math.floor(Number(this.subjectCountInput)) || 1),
      this.maxSubjects,
    );
    this.pupilCountInput = n;
    this.subjectCountInput = m;

    if (this.pupils.length > 0) {
      if (
        !this.doc.defaultView?.confirm(
          'This replaces all pupil rows and subject grids. General information at the top is kept. Continue?',
        )
      ) {
        return;
      }
    }

    this.pupils = Array.from({ length: n }, () => this.emptyPupilDraft(m));
    this.batchMessage = `Ready: ${n} pupil row(s), ${m} subject line(s) each. Fill general information once, then each pupil.`;
  }

  mergeFormData(p: BatchPupilDraft): ReportFormData {
    const balance = parseFloat(p.feesBalance) || 0;
    const nextTerm = parseFloat(p.feesNextTerm) || 0;
    return {
      organization: '',
      schoolName: '',
      department: this.general.department.trim(),
      schoolAddress: this.general.schoolAddress.trim(),
      studentName: p.studentName.trim(),
      reportYear: this.general.reportYear.trim(),
      termSession: this.general.termSession.trim(),
      reportClass: this.general.reportClass.trim(),
      reportDate: this.general.reportDate.trim(),
      attendance: String(p.attendance ?? '').trim(),
      expectedAttendance: String(p.expectedAttendance ?? '').trim(),
      vacationDate: this.general.vacationDate.trim(),
      classTeacher: this.general.classTeacher.trim(),
      classTeacherRemarks: p.classTeacherRemarks.trim(),
      headteacherRemarks: this.general.headteacherRemarks.trim(),
      feesBalance: p.feesBalance.trim(),
      feesNextTerm: p.feesNextTerm.trim(),
      totalDue: String(balance + nextTerm),
    };
  }

  private getSubjectsForPupil(p: BatchPupilDraft): SubjectEntry[] {
    return p.subjects
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

  private validateGeneral(): string[] {
    const checks: { v: string; label: string }[] = [
      { v: this.general.department, label: 'Department (general)' },
      { v: this.general.reportClass, label: 'Form / Class (general)' },
      { v: this.general.reportYear, label: 'Year (general)' },
      { v: this.general.termSession, label: 'Term (general)' },
      { v: this.general.reportDate, label: 'Report date (general)' },
      { v: this.general.classTeacher, label: 'Class teacher (general)' },
    ];
    const miss: string[] = [];
    for (const { v, label } of checks) {
      if (!String(v ?? '').trim()) miss.push(label);
    }
    const dept = this.selectedDepartment();
    if (this.general.department.trim() && dept && dept.classes.length === 0) {
      miss.push('Selected department has no class groups — add them under Classes & departments');
    }
    return miss;
  }

  private validatePupil(index: number): string[] {
    const p = this.pupils[index];
    if (!p) return ['Invalid pupil index'];
    const miss: string[] = [];
    if (!p.studentName.trim()) miss.push(`Pupil ${index + 1}: Student name`);
    if (!p.feesBalance.trim()) miss.push(`Pupil ${index + 1}: Fees balance`);
    if (!p.feesNextTerm.trim()) miss.push(`Pupil ${index + 1}: Fees for next term`);
    const subs = this.getSubjectsForPupil(p);
    if (subs.length === 0) miss.push(`Pupil ${index + 1}: At least one subject with exam or class score`);
    return miss;
  }

  validateEntireBatch(): string[] {
    return [...this.validateGeneral(), ...this.pupils.flatMap((_, i) => this.validatePupil(i))];
  }

  onScoreInput(pupilIdx: number, subIdx: number, field: 'exam' | 'class'): void {
    const p = this.pupils[pupilIdx];
    const s = p?.subjects[subIdx];
    if (!s) return;
    const { exam, classwork } = this.report.enforceLimits(s.exam, s.classwork, field);
    s.exam = exam;
    s.classwork = classwork;
    this.syncGradeRemarks(pupilIdx, subIdx);
  }

  syncGradeRemarks(pupilIdx: number, subIdx: number): void {
    const s = this.pupils[pupilIdx]?.subjects[subIdx];
    if (!s) return;
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

  sumLine(pupilIdx: number, subIdx: number): string {
    const s = this.pupils[pupilIdx]?.subjects[subIdx];
    if (!s) return '—';
    return this.report.sumDisplay(s.exam, s.classwork);
  }

  previewPupil(pupilIdx: number): void {
    this.batchMessage = '';
    const gMiss = this.validateGeneral();
    const pMiss = this.validatePupil(pupilIdx);
    const all = [...gMiss, ...pMiss];
    if (all.length > 0) {
      window.alert('Fix the following:\n• ' + all.slice(0, 12).join('\n• ') + (all.length > 12 ? '\n• …' : ''));
      return;
    }
    const p = this.pupils[pupilIdx];
    const subjects = this.getSubjectsForPupil(p);
    const fd = this.mergeFormData(p);
    const html = this.report.buildTerminalReport(subjects, fd);
    this.reportHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    this.previewPupilLabel = `Pupil ${pupilIdx + 1}: ${p.studentName || '—'}`;
    this.showReportModal = true;
    this.watermarkApplied = false;
  }

  /** Opens this pupil’s report in a new browser tab and triggers print (same as multi-report). */
  printPupilInNewWindow(pupilIdx: number): void {
    this.batchMessage = '';
    const gMiss = this.validateGeneral();
    const pMiss = this.validatePupil(pupilIdx);
    const all = [...gMiss, ...pMiss];
    if (all.length > 0) {
      window.alert('Fix the following:\n• ' + all.slice(0, 12).join('\n• ') + (all.length > 12 ? '\n• …' : ''));
      return;
    }
    const p = this.pupils[pupilIdx];
    const subjects = this.getSubjectsForPupil(p);
    const fd = this.mergeFormData(p);
    this.report.printReportInNewWindow(subjects, fd, `batch-pupil-${pupilIdx + 1}`);
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.reportHtml = null;
    this.watermarkApplied = false;
    this.previewPupilLabel = '';
  }

  printModalReport(): void {
    if (!this.pupils.length || !this.previewPupilLabel) return;
    const m = /^Pupil (\d+):/.exec(this.previewPupilLabel);
    const idx = m ? parseInt(m[1], 10) - 1 : 0;
    const p = this.pupils[idx];
    if (!p) return;
    const form = this.mergeFormData(p);
    const studentName = this.report.sanitizeFilenamePart(form.studentName);
    const reportClass = this.report.sanitizeFilenamePart(form.reportClass);
    const termSession = this.report.sanitizeFilenamePart(form.termSession);
    const date =
      form.reportDate && form.reportDate.trim()
        ? form.reportDate.trim()
        : new Date().toISOString().slice(0, 10);
    const printTitle = `batch_${studentName}_${reportClass}_${termSession}_${date}`;
    const previousTitle = this.doc.title;
    this.doc.title = printTitle;
    this.doc.defaultView?.print();
    this.doc.defaultView!.onafterprint = () => {
      this.doc.title = previousTitle;
      this.doc.defaultView!.onafterprint = null;
    };
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

  async printAllReports(): Promise<void> {
    this.batchMessage = '';
    const errors = this.validateEntireBatch();
    if (errors.length > 0) {
      window.alert(
        'Cannot print until fixed:\n• ' + errors.slice(0, 15).join('\n• ') + (errors.length > 15 ? '\n• …' : ''),
      );
      return;
    }
    if (
      !this.doc.defaultView?.confirm(
        `Open ${this.pupils.length} print dialog(s) in new tab(s). Allow pop-ups if nothing appears.`,
      )
    ) {
      return;
    }

    for (let i = 0; i < this.pupils.length; i++) {
      const p = this.pupils[i];
      const subjects = this.getSubjectsForPupil(p);
      const fd = this.mergeFormData(p);
      this.report.printReportInNewWindow(subjects, fd, `batch-${i + 1}`);
      await new Promise((r) => setTimeout(r, 450));
    }
    this.batchMessage = `Sent ${this.pupils.length} report(s) to print preview (new windows).`;
  }
}
