import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportFormData, ReportService, SubjectEntry } from '../report.service';

type RawScore = { ClassScore?: number; ExamScore?: number };
type RawPupil = Record<string, unknown> & {
  No?: number;
  Name?: string;
  ActualAttendance?: number;
  ExpectedAttendance?: number;
  Arrears?: number;
  NextTermFee?: number;
};

interface ParsedPupil {
  no: number | '';
  name: string;
  attendance: string;
  expectedAttendance: string;
  feesBalance: string;
  feesNextTerm: string;
  subjects: SubjectEntry[];
}

@Component({
  selector: 'app-json-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './json-report.component.html',
})
export class JsonReportComponent {
  private report = inject(ReportService);

  jsonSectionOpen = false;
  parseError = '';
  message = '';

  jsonText = '';
  private importFile: File | null = null;

  /** Fields entered once (merged into every pupil’s print). */
  general: Omit<ReportFormData, 'studentName' | 'attendance' | 'expectedAttendance' | 'feesBalance' | 'feesNextTerm' | 'totalDue'> =
    {
      department: '',
      schoolAddress: '',
      reportYear: '',
      termSession: '',
      reportClass: '',
      reportDate: '',
      vacationDate: '',
      classTeacher: '',
      classTeacherRemarks: '',
      headteacherRemarks: '',
    };

  pupils: ParsedPupil[] = [];

  onImportSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.importFile = input.files?.[0] ?? null;
  }

  async loadImportFile(): Promise<void> {
    this.parseError = '';
    this.message = '';
    if (!this.importFile) {
      this.parseError = 'Choose a JSON file first.';
      return;
    }
    try {
      this.jsonText = await this.importFile.text();
      this.message = 'JSON loaded. Click “Parse JSON”.';
    } catch {
      this.parseError = 'Could not read file.';
    }
  }

  private isScoreShape(v: unknown): v is RawScore {
    if (!v || typeof v !== 'object') return false;
    const o = v as any;
    return 'ClassScore' in o || 'ExamScore' in o;
  }

  private subjectKeysFromRows(rows: RawPupil[]): string[] {
    if (rows.length === 0) return [];
    const ignore = new Set([
      'No',
      'Name',
      'ActualAttendance',
      'ExpectedAttendance',
      'Arrears',
      'NextTermFee',
    ]);
    const first = rows[0];
    const keys: string[] = [];
    for (const k of Object.keys(first)) {
      if (ignore.has(k)) continue;
      const v = (first as any)[k];
      if (this.isScoreShape(v)) keys.push(k);
    }
    // include any additional subjects found in other rows
    const seen = new Set(keys);
    for (const r of rows.slice(1)) {
      for (const k of Object.keys(r)) {
        if (ignore.has(k) || seen.has(k)) continue;
        const v = (r as any)[k];
        if (this.isScoreShape(v)) {
          keys.push(k);
          seen.add(k);
        }
      }
    }
    return keys;
  }

  parseJson(): void {
    this.parseError = '';
    this.message = '';
    this.pupils = [];

    let data: unknown;
    try {
      data = JSON.parse(this.jsonText);
    } catch {
      this.parseError = 'Invalid JSON.';
      return;
    }
    if (!Array.isArray(data)) {
      this.parseError = 'JSON must be an array of pupil objects.';
      return;
    }
    const rows = data as RawPupil[];
    const subjectKeys = this.subjectKeysFromRows(rows);
    if (subjectKeys.length === 0) {
      this.parseError = 'No subject columns found. Expected keys like Language/Numeracy with { ClassScore, ExamScore }.';
      return;
    }

    const parsed: ParsedPupil[] = rows.map((r, idx) => {
      const noRaw = Number((r as any).No);
      const no = Number.isFinite(noRaw) ? noRaw : '';
      const name = String((r as any).Name ?? '').trim() || `Pupil ${idx + 1}`;
      const attendance = String((r as any).ActualAttendance ?? '').trim();
      const expectedAttendance = String((r as any).ExpectedAttendance ?? '').trim();
      const feesBalance = String((r as any).Arrears ?? '').trim();
      const feesNextTerm = String((r as any).NextTermFee ?? '').trim();

      const subjects: SubjectEntry[] = [];
      for (const key of subjectKeys) {
        const cell = (r as any)[key];
        if (!this.isScoreShape(cell)) continue;
        const cw = Number((cell as any).ClassScore) || 0;
        const ex = Number((cell as any).ExamScore) || 0;
        const sub = this.report.computeSubjectFromScores(key, ex, cw, '', '');
        if (sub) subjects.push(sub);
      }

      return {
        no,
        name,
        attendance,
        expectedAttendance,
        feesBalance,
        feesNextTerm,
        subjects,
      };
    });

    this.pupils = parsed.filter((p) => p.subjects.length > 0 && p.name.trim());
    this.message = `Parsed ${this.pupils.length} pupil(s).`;
  }

  private validateGeneral(): string[] {
    const missing: string[] = [];
    const req: Array<[keyof typeof this.general, string]> = [
      ['department', 'Department'],
      ['reportClass', 'Class / Form'],
      ['reportYear', 'Year'],
      ['termSession', 'Term'],
      ['reportDate', 'Report date'],
      ['classTeacher', 'Class teacher'],
      ['schoolAddress', 'School address'],
    ];
    for (const [k, label] of req) {
      if (!String(this.general[k] ?? '').trim()) missing.push(label);
    }
    return missing;
  }

  generalMissing(): string[] {
    return this.validateGeneral();
  }

  private buildFormDataForPupil(p: ParsedPupil): ReportFormData {
    const feesBalanceNum = Number(p.feesBalance) || 0;
    const feesNextNum = Number(p.feesNextTerm) || 0;
    return {
      ...this.report.emptyForm(),
      ...this.general,
      studentName: p.name,
      attendance: p.attendance,
      expectedAttendance: p.expectedAttendance,
      feesBalance: String(feesBalanceNum),
      feesNextTerm: String(feesNextNum),
      totalDue: String(feesBalanceNum + feesNextNum),
    };
  }

  printOne(p: ParsedPupil): void {
    this.parseError = '';
    this.message = '';
    const missing = this.validateGeneral();
    if (missing.length > 0) {
      const msg = `Fill required general fields first: ${missing.join(', ')}`;
      this.parseError = msg;
      window.alert(msg);
      return;
    }
    const reportId = `json-${p.no || p.name}`;
    this.report.printReportInNewWindow(p.subjects, this.buildFormDataForPupil(p), reportId);
    this.message = `Opened report for ${p.name}.`;
  }

  printAll(): void {
    this.parseError = '';
    this.message = '';
    if (this.pupils.length === 0) {
      this.parseError = 'Parse a JSON list first.';
      return;
    }
    const missing = this.validateGeneral();
    if (missing.length > 0) {
      this.parseError = `Fill required general fields: ${missing.join(', ')}`;
      return;
    }

    for (const p of this.pupils) {
      const reportId = `json-${p.no || p.name}`;
      this.report.printReportInNewWindow(p.subjects, this.buildFormDataForPupil(p), reportId);
    }
    this.message = `Opened ${this.pupils.length} report(s) in new tabs/windows.`;
  }
}

