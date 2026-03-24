import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface ReportFormData {
  organization?: string;
  schoolName?: string;
  department: string;
  schoolAddress: string;
  studentName: string;
  reportYear: string;
  termSession: string;
  reportClass: string;
  reportDate: string;
  attendance: string;
  expectedAttendance: string;
  vacationDate: string;
  classTeacher: string;
  classTeacherRemarks: string;
  headteacherRemarks: string;
  feesBalance: string;
  feesNextTerm: string;
  totalDue: string;
}

export interface SubjectEntry {
  name: string;
  exam: number;
  classwork: number;
  total: number;
  grade: string;
  points: number | '';
  remarks: string;
}

export interface CsvReportGroup {
  id: string;
  meta: ReportFormData;
  subjects: SubjectEntry[];
}

const GRADING_SCALE = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 75, grade: 'A-' },
  { min: 70, grade: 'B+' },
  { min: 65, grade: 'B' },
  { min: 60, grade: 'B-' },
  { min: 55, grade: 'C+' },
  { min: 50, grade: 'C' },
  { min: 45, grade: 'C-' },
  { min: 40, grade: 'D+' },
  { min: 35, grade: 'D' },
  { min: 30, grade: 'D-' },
  { min: 0, grade: 'E' },
] as const;

@Injectable({ providedIn: 'root' })
export class ReportService {
  private doc = inject(DOCUMENT);

  readonly EXAM_MAX = 60;
  readonly CLASS_MAX = 40;
  readonly TOTAL_MAX = this.EXAM_MAX + this.CLASS_MAX;

  readonly CSV_TEMPLATE_HEADER =
    'reportId,department,schoolAddress,studentName,reportClass,termSession,reportYear,reportDate,attendance,expectedAttendance,vacationDate,classTeacher,classTeacherRemarks,headteacherRemarks,feesBalance,feesNextTerm,subjectName,examScore,classworkScore';

  readonly TEMPLATE_GUIDE_URL =
    'https://drive.google.com/file/d/1RmZEYyvTA7-4lWnPP3TJwfuNKKbkgxQ6/view?usp=sharing';

  get schoolLogoUrl(): string {
    return new URL('dynamic-logo.jpeg', this.doc.baseURI).href;
  }

  get watermarkAssetUrl(): string {
    return new URL('adinkra-bnw.webp', this.doc.baseURI).href;
  }

  emptyForm(): ReportFormData {
    return {
      organization: '',
      schoolName: '',
      department: '',
      schoolAddress: '',
      studentName: '',
      reportYear: '',
      termSession: '',
      reportClass: '',
      reportDate: '',
      attendance: '',
      expectedAttendance: '',
      vacationDate: '',
      classTeacher: '',
      classTeacherRemarks: '',
      headteacherRemarks: '',
      feesBalance: '',
      feesNextTerm: '',
      totalDue: '0',
    };
  }

  gradeFromPercentage(pct: number): string {
    const score = Math.min(100, Math.max(0, Number(pct) || 0));
    const entry = GRADING_SCALE.find((e) => score >= e.min);
    return entry ? entry.grade : 'E';
  }

  pointsFromGrade(grade: string): number | '' {
    const g = String(grade).toUpperCase().replace(/\s/g, '');
    const map: Record<string, number> = {
      'A+': 12,
      A: 11,
      'A-': 10,
      'B+': 9,
      B: 8,
      'B-': 7,
      'C+': 6,
      C: 5,
      'C-': 4,
      'D+': 3,
      D: 2,
      'D-': 1,
      E: 0,
    };
    return map[g] ?? '';
  }

  gradeToRemark(grade: string): string {
    const g = String(grade).toUpperCase().replace(/\s/g, '');
    if (g === 'A+') return 'Excellent';
    if (g === 'A' || g === 'A-') return 'Very Good';
    if (g === 'B+' || g === 'B' || g === 'B-') return 'Good';
    if (g === 'C+' || g === 'C') return 'Average';
    if (g === 'C-') return 'Below Average';
    if (g === 'D+' || g === 'D' || g === 'D-') return 'Poor';
    if (g === 'E') return 'Very Poor';
    return '';
  }

  escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  escapeHtmlForUi(s: string): string {
    return this.escapeHtml(s);
  }

  sanitizeFilenamePart(s: string): string {
    return (
      String(s || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[/\\:*?"<>|]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'Report'
    );
  }

  sanitizeFilenamePartPreserveSpaces(s: string): string {
    return (
      String(s || '')
        .trim()
        .replace(/[/\\:*?"<>|]/g, '') || 'Report'
    );
  }

  buildTerminalReport(subjects: SubjectEntry[], f: ReportFormData): string {
    const logoSrc = this.schoolLogoUrl;
    const logoFallbackSrc = logoSrc;
    const logoHtml = `<img src="${logoSrc.replace(/"/g, '&quot;')}" alt="School logo" onerror="this.onerror=null;this.src='${logoFallbackSrc.replace(/'/g, "\\'")}';" />`;
    const watermarkClass = 'report-watermark';

    const schoolName = this.escapeHtml('DYNAMIC DIVINE ACADEMY');
    const schoolAddress = f.schoolAddress ? this.escapeHtml(f.schoolAddress) : '';

    const subjectRowsHtml = subjects
      .map(
        (s) =>
          `<tr><td class="col-subject">${this.escapeHtml(s.name)}</td><td>${s.exam}</td><td>${s.classwork}</td><td>${s.total}</td><td>${this.escapeHtml(s.grade)}</td><td>${s.points !== '' ? s.points : ''}</td><td>${this.escapeHtml(s.remarks)}</td></tr>`,
      )
      .join('');

    const attendanceText = f.attendance ? this.escapeHtml(f.attendance) : '';
    const expectedAttendanceText = f.expectedAttendance
      ? this.escapeHtml(f.expectedAttendance)
      : '';
    const vacationDateText = f.vacationDate ? this.escapeHtml(f.vacationDate) : '';

    return `
<div class="${watermarkClass}" aria-hidden="true"></div>
<div class="report-inner">
  <div class="report-header">
    <div class="report-logo">${logoHtml}</div>
    <div class="report-school-block">
      <div class="report-school-name">${schoolName}</div>
      ${schoolAddress ? `<div class="report-school-address">${schoolAddress}</div>` : ''}
    </div>
  </div>
  <div class="report-title-row">
    <span class="report-title">TERMINAL REPORT FORM</span>
    <span class="report-year-term">YEAR ${this.escapeHtml(f.reportYear || '')} &nbsp; TERM ${this.escapeHtml(f.termSession || '')}</span>
  </div>
  <div class="report-student-line">
    <span><strong>Name</strong> ${this.escapeHtml(f.studentName || '')}</span>
    <span><strong>${this.escapeHtml(f.reportClass || 'FORM')}</strong></span>
    <span><strong>Attendance</strong> ${attendanceText}</span>
    <span><strong>Expected Attendance</strong> ${expectedAttendanceText}</span>
    <span><strong>Vacation</strong> ${vacationDateText}</span>
  </div>
  <table class="report-table">
    <thead>
      <tr>
        <th>SUBJECTS</th>
        <th>EXAM</th>
        <th>CLASS</th>
        <th>SUM</th>
        <th>Grade</th>
        <th>POINTS</th>
        <th>REMARKS</th>
      </tr>
    </thead>
    <tbody>${subjectRowsHtml}</tbody>
  </table>
  <div class="report-grade-key">
    <strong>KEY</strong>
    A+: 90–100 &nbsp; A: 80–89 &nbsp; A−: 75–79 &nbsp; B+: 70–74 &nbsp; B: 65–69 &nbsp; B−: 60–64 &nbsp; C+: 55–59 &nbsp; C: 50–54 &nbsp; C−: 45–49 &nbsp; D+: 40–44 &nbsp; D: 35–39 &nbsp; D−: 30–34 &nbsp; E: 0–29
  </div>
  <div class="report-remarks-section">
    <div class="line"><span class="label">Class Teacher's Comments:</span><span class="dotted">${this.escapeHtml(f.classTeacherRemarks || '')}</span></div>
    <div class="line"><span class="label">Headteacher's/Deputy Headteacher's Comments:</span><span class="dotted">${this.escapeHtml(f.headteacherRemarks || '')}</span></div>
    <div class="line"><span class="label">Report seen by Parent/Guardian:</span><span class="dotted"></span> <span class="label">Signature:</span><span class="dotted"></span></div>
  </div>
  <div class="report-fees-box">
    <strong>FEES RECORD</strong>
    <div>Fees Balance: ${this.escapeHtml(f.feesBalance || '')}</div>
    <div>Fees for next term: ${this.escapeHtml(f.feesNextTerm || '')}</div>
    <div>Total due on opening day GHS: ${this.escapeHtml(f.totalDue || '')}</div>
  </div>
</div>
  `.trim();
  }

  computeSubjectFromScores(
    name: string,
    exam: number,
    classwork: number,
    gradeOverride: string,
    remarksOverride: string,
  ): SubjectEntry | null {
    let ex = Math.min(this.EXAM_MAX, Math.max(0, exam));
    let cw = Math.min(this.CLASS_MAX, Math.max(0, classwork));
    if (ex + cw > this.TOTAL_MAX) {
      cw = Math.min(this.CLASS_MAX, Math.max(0, this.TOTAL_MAX - ex));
    }
    const total = Math.min(this.TOTAL_MAX, ex + cw);
    if (ex === 0 && cw === 0) return null;
    let grade = gradeOverride.trim();
    let remarks = remarksOverride.trim();
    if (!grade) grade = this.gradeFromPercentage(total);
    if (!remarks && grade) remarks = this.gradeToRemark(grade);
    const points = grade ? this.pointsFromGrade(grade) : '';
    return { name: name.trim() || 'Subject', exam: ex, classwork: cw, total, grade, points, remarks };
  }

  enforceLimits(
    examRaw: string,
    classRaw: string,
    changed: 'exam' | 'class',
  ): { exam: string; classwork: string } {
    let exam = examRaw === '' ? null : Number(examRaw);
    let classwork = classRaw === '' ? null : Number(classRaw);
    let examStr = examRaw;
    let classStr = classRaw;

    if (exam !== null && !Number.isNaN(exam) && exam > this.EXAM_MAX) {
      exam = this.EXAM_MAX;
      examStr = String(exam);
    }
    if (
      classwork !== null &&
      !Number.isNaN(classwork) &&
      classwork > this.CLASS_MAX
    ) {
      classwork = this.CLASS_MAX;
      classStr = String(classwork);
    }

    const examNum =
      exam === null || Number.isNaN(exam) ? 0 : exam;
    const classNum =
      classwork === null || Number.isNaN(classwork) ? 0 : classwork;

    if (examNum + classNum > this.TOTAL_MAX) {
      if (changed === 'exam') {
        const allowedExam = Math.min(this.EXAM_MAX, this.TOTAL_MAX - classNum);
        examStr = String(allowedExam);
      } else {
        const allowedClass = Math.min(this.CLASS_MAX, this.TOTAL_MAX - examNum);
        classStr = String(allowedClass);
      }
    }
    return { exam: examStr, classwork: classStr };
  }

  sumDisplay(examStr: string, classworkStr: string): string {
    const exam = parseFloat(examStr) || 0;
    const cw = parseFloat(classworkStr) || 0;
    if (exam === 0 && cw === 0) return '—';
    return String(Math.min(this.TOTAL_MAX, exam + cw));
  }

  parseCsv2D(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          const next = text[i + 1];
          if (next === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        if (row.some((c) => String(c).trim() !== '')) rows.push(row);
        row = [];
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      if (row.some((c) => String(c).trim() !== '')) rows.push(row);
    }
    return rows;
  }

  normalizeCsvNumber(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  normalizeSubjectFromCsv(
    subjectName: unknown,
    examScore: unknown,
    classworkScore: unknown,
  ): SubjectEntry | null {
    const name = String(subjectName || '').trim();
    if (!name) return null;
    let exam = Math.min(
      this.EXAM_MAX,
      Math.max(0, this.normalizeCsvNumber(examScore)),
    );
    let classwork = Math.min(
      this.CLASS_MAX,
      Math.max(0, this.normalizeCsvNumber(classworkScore)),
    );
    if (exam + classwork > this.TOTAL_MAX) {
      classwork = Math.min(this.CLASS_MAX, Math.max(0, this.TOTAL_MAX - exam));
    }
    const total = Math.min(this.TOTAL_MAX, exam + classwork);
    if (exam === 0 && classwork === 0) return null;
    const grade = this.gradeFromPercentage(total);
    const remarks = this.gradeToRemark(grade);
    const points = this.pointsFromGrade(grade);
    return { name, exam, classwork, total, grade, points, remarks };
  }

  groupCsvReports(rowObjects: Record<string, string>[]): CsvReportGroup[] {
    const reportsById = new Map<
      string,
      { meta: ReportFormData; subjects: SubjectEntry[] }
    >();
    const order: string[] = [];

    for (const r of rowObjects) {
      const reportId = String(r['reportid'] || '').trim();
      if (!reportId) continue;

      if (!reportsById.has(reportId)) {
        const feesBalance = this.normalizeCsvNumber(r['feesbalance']);
        const feesNextTerm = this.normalizeCsvNumber(r['feesnextterm']);
        reportsById.set(reportId, {
          meta: {
            department: String(r['department'] || ''),
            schoolAddress: String(r['schooladdress'] || ''),
            studentName: String(r['studentname'] || ''),
            reportClass: String(r['reportclass'] || ''),
            termSession: String(r['termsession'] || ''),
            reportYear: String(r['reportyear'] || ''),
            reportDate: String(r['reportdate'] || ''),
            attendance: String(r['attendance'] || ''),
            expectedAttendance: String(r['expectedattendance'] || ''),
            vacationDate: String(r['vacationdate'] || ''),
            classTeacher: String(r['classteacher'] || ''),
            classTeacherRemarks: String(r['classteacherremarks'] || ''),
            headteacherRemarks: String(r['headteacherremarks'] || ''),
            feesBalance: String(feesBalance),
            feesNextTerm: String(feesNextTerm),
            totalDue: String(feesBalance + feesNextTerm),
          },
          subjects: [],
        });
        order.push(reportId);
      }
      const group = reportsById.get(reportId)!;
      const sub = this.normalizeSubjectFromCsv(
        r['subjectname'],
        r['examscore'],
        r['classworkscore'],
      );
      if (sub) group.subjects.push(sub);
    }

    return order
      .map((id) => {
        const g = reportsById.get(id)!;
        return { id, meta: g.meta, subjects: g.subjects };
      })
      .filter((x) => x.subjects.length > 0);
  }

  parseCsvToRows(text: string): Record<string, string>[] {
    const rows2D = this.parseCsv2D(text);
    if (rows2D.length < 2) return [];
    const headers = rows2D[0].map((h) => String(h).trim().toLowerCase());
    return rows2D.slice(1).map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? '';
      });
      return obj;
    });
  }

  printReportInNewWindow(
    subjects: SubjectEntry[],
    formData: ReportFormData,
    reportId: string,
  ): void {
    const reportHtml = this.buildTerminalReport(subjects, formData);
    const w = this.doc.defaultView?.open('', '_blank');
    if (!w) {
      this.doc.defaultView?.alert('Please allow popups to download/print PDFs.');
      return;
    }

    const department = formData.department ? String(formData.department) : '';
    const studentName = formData.studentName ? String(formData.studentName) : '';
    const termSession = formData.termSession ? String(formData.termSession) : '';
    const safeReportId = this.sanitizeFilenamePart(reportId);
    const safeDepartment = this.sanitizeFilenamePart(department);
    const safeStudentName = this.sanitizeFilenamePart(studentName);
    const safeTerm = this.sanitizeFilenamePartPreserveSpaces(termSession);
    const printTitle = `${safeReportId}-${safeDepartment}-${safeStudentName}-${safeTerm}`;

    const bgUrlEscaped = String(this.watermarkAssetUrl)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
    const baseHrefEscaped = String(
      this.doc.baseURI || this.doc.defaultView?.location.href || '',
    )
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '&quot;');

    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${baseHrefEscaped}" />
  <title>${printTitle}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="report-border">
    <div class="report-sheet">${reportHtml}</div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        var el = document.querySelector('.report-watermark:not(.no-bg-image)');
        if (el) el.style.backgroundImage = "url('${bgUrlEscaped}')";
        window.print();
      }, 50);
    };
  </script>
</body>
</html>`);
    w.document.close();
  }

  downloadCsvTemplateHeaderOnly(): void {
    const blob = new Blob([`${this.CSV_TEMPLATE_HEADER}\n`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = 'sample_reports.csv';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  openTemplateGuide(): void {
    this.doc.defaultView?.open(this.TEMPLATE_GUIDE_URL, '_blank', 'noopener,noreferrer');
  }
}
