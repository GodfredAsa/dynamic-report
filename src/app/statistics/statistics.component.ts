import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { StudentStoreService } from '../data/student-store.service';
import { DepartmentStoreService } from '../data/department-store.service';
import { AppUserStoreService } from '../data/app-user-store.service';
import { FeeStoreService } from '../data/fee-store.service';
import { FEE_TYPES, FeeType } from '../data/fee.model';

/** Unique students that appear in at least one department’s `assignedStudentIds`, by gender. */
export interface AssignedGenderTotals {
  male: number;
  female: number;
  total: number;
}

export interface DepartmentGenderRow {
  id: string;
  name: string;
  male: number;
  female: number;
  total: number;
  malePct: number;
  femalePct: number;
}

export interface StaffBreakdown {
  teaching: number;
  nonTeaching: number;
  total: number;
}

/** Ledger totals from `fees.json`, grouped by currency then fee type. */
export interface FeeCurrencyBreakdown {
  currency: string;
  total: number;
  byType: Record<FeeType, number>;
}

export interface FeeLinePoint {
  date: string;
  total: number;
}

export interface FeeLinePointScaled extends FeeLinePoint {
  x: number;
  y: number;
}

export interface FeeLineSeries {
  currency: string;
  color: string;
  points: FeeLinePointScaled[];
  pathD: string;
}

export interface FeeLineChartLabels {
  minDate: string;
  maxDate: string;
  maxValue: number;
}

export interface FeeTooltipState {
  visible: boolean;
  x: number;
  y: number;
  color: string;
  text: string;
}

@Component({
  selector: 'app-statistics',
  imports: [CommonModule, RouterLink],
  templateUrl: './statistics.component.html',
})
export class StatisticsComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private studentStore = inject(StudentStoreService);
  departmentStore = inject(DepartmentStoreService);
  private staffStore = inject(AppUserStoreService);
  feeStore = inject(FeeStoreService);

  readonly feeTypes = FEE_TYPES;

  user = this.auth.currentUser;
  studentsLoaded = this.studentStore.loaded;
  departmentsLoaded = this.departmentStore.loaded;
  staffLoaded = this.staffStore.loaded;
  feeLedgerLoaded = this.feeStore.loaded;

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  /** From `staff.json`: teaching vs non-teaching (`staffCategory`). */
  staffBreakdown(): StaffBreakdown {
    let teaching = 0;
    let nonTeaching = 0;
    for (const u of this.staffStore.users()) {
      if (u.staffCategory === 'non-teaching') nonTeaching++;
      else teaching++;
    }
    return { teaching, nonTeaching, total: teaching + nonTeaching };
  }

  /** All rows in `students.json`. */
  totalStudentCount(): number {
    return this.studentStore.students().length;
  }

  /** Staff plus students — total people in the system. */
  totalPeopleCount(): number {
    return this.staffBreakdown().total + this.totalStudentCount();
  }

  formatLedgerMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  /** Sums from `fees.json` by currency and by fee type (Utility, Feeding, Classes, Termly money). */
  feeLedgerBreakdown(): FeeCurrencyBreakdown[] {
    const fees = this.feeStore.fees();
    const byCur = new Map<string, Map<FeeType, number>>();
    for (const f of fees) {
      const cur = (f.currency || 'GHS').trim().toUpperCase().slice(0, 3) || 'GHS';
      if (!byCur.has(cur)) {
        const m = new Map<FeeType, number>();
        for (const t of FEE_TYPES) m.set(t, 0);
        byCur.set(cur, m);
      }
      const m = byCur.get(cur)!;
      m.set(f.type, (m.get(f.type) ?? 0) + f.amount);
    }
    return [...byCur.entries()]
      .map(([currency, typeMap]) => {
        let total = 0;
        const byType = {} as Record<FeeType, number>;
        for (const t of FEE_TYPES) {
          const v = typeMap.get(t) ?? 0;
          byType[t] = v;
          total += v;
        }
        return { currency, total, byType };
      })
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  /** Totals across all currencies, by fee type, for the donut. */
  private feeTypeTotals(): { totalAll: number; byType: Record<FeeType, number> } {
    const byType = {} as Record<FeeType, number>;
    for (const t of FEE_TYPES) byType[t] = 0;
    let totalAll = 0;
    for (const f of this.feeStore.fees()) {
      const amt = Number(f.amount) || 0;
      byType[f.type] = (byType[f.type] ?? 0) + amt;
      totalAll += amt;
    }
    return { totalAll, byType };
  }

  /** CSS conic-gradient donut for fee type contribution percentages. */
  feeTypeDonutConic(): string {
    const { totalAll, byType } = this.feeTypeTotals();
    if (totalAll === 0) {
      return 'conic-gradient(rgb(51 65 85) 0deg 360deg)';
    }
    const colors = ['#facc15', '#22c55e', '#38bdf8', '#a855f7'];
    let start = 0;
    const segments: string[] = [];
    FEE_TYPES.forEach((t, idx) => {
      const value = byType[t] ?? 0;
      if (value <= 0) return;
      const deg = (value / totalAll) * 360;
      const end = start + deg;
      const color = colors[idx % colors.length];
      segments.push(`${color} ${start}deg ${end}deg`);
      start = end;
    });
    if (segments.length === 0) {
      return 'conic-gradient(rgb(51 65 85) 0deg 360deg)';
    }
    return `conic-gradient(${segments.join(',')})`;
  }

  feeTypePct(type: FeeType): number {
    const { totalAll, byType } = this.feeTypeTotals();
    if (!totalAll) return 0;
    const value = byType[type] ?? 0;
    return Math.round(((value / totalAll) * 1000)) / 10;
  }

  feeTypeAmount(type: FeeType): number {
    const { byType } = this.feeTypeTotals();
    return byType[type] ?? 0;
  }

  /** Fee totals by date (YYYY-MM-DD), grouped per currency for a line chart. */
  feeLineChartSeries(): FeeLineSeries[] {
    const fees = this.feeStore.fees();
    const byCurDate = new Map<string, Map<string, number>>();
    for (const f of fees) {
      const date = String(f.date ?? '').trim();
      if (!date) continue;
      const cur = (f.currency || 'GHS').trim().toUpperCase().slice(0, 3) || 'GHS';
      if (!byCurDate.has(cur)) byCurDate.set(cur, new Map<string, number>());
      const m = byCurDate.get(cur)!;
      m.set(date, (m.get(date) ?? 0) + (Number(f.amount) || 0));
    }

    const colors = ['#38bdf8', '#34ca94', '#facc15', '#a855f7', '#fb7185'];
    const seriesRaw: { currency: string; points: FeeLinePoint[] }[] = [...byCurDate.entries()]
      .map(([currency, m]) => {
        const points = [...m.entries()]
          .map(([d, total]) => ({ date: d, total }))
          .sort((a, b) => a.date.localeCompare(b.date));
        return { currency, points };
      })
      .sort((a, b) => a.currency.localeCompare(b.currency));

    const allMax = Math.max(0, ...seriesRaw.flatMap((s) => s.points.map((p) => p.total)));

    const width = 560;
    const height = 220;
    const padX = 28;
    const padY = 18;
    const innerW = Math.max(1, width - padX * 2);
    const innerH = Math.max(1, height - padY * 2);

    const toX = (i: number, n: number): number => {
      if (n <= 1) return padX + innerW / 2;
      return padX + (i / (n - 1)) * innerW;
    };
    const toY = (v: number): number => {
      if (allMax <= 0) return padY + innerH;
      const t = Math.max(0, Math.min(1, v / allMax));
      return padY + (1 - t) * innerH;
    };

    return seriesRaw.map((s, idx) => {
      const n = s.points.length;
      const scaled: FeeLinePointScaled[] = s.points.map((p, i) => {
        const x = toX(i, n);
        const y = toY(p.total);
        return { ...p, x, y };
      });
      // If there is only one point, draw a tiny line segment so it renders.
      const d =
        n === 0
          ? ''
          : n === 1
            ? `M ${(scaled[0].x - 0.01).toFixed(2)} ${scaled[0].y.toFixed(2)} L ${(scaled[0].x + 0.01).toFixed(2)} ${scaled[0].y.toFixed(2)}`
            : scaled
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(' ');
      return {
        currency: s.currency,
        color: colors[idx % colors.length],
        points: scaled,
        pathD: d,
      };
    });
  }

  feeLineChartLabels(): FeeLineChartLabels {
    const all = this.feeLineChartSeries().flatMap((s) => s.points);
    if (all.length === 0) return { minDate: '', maxDate: '', maxValue: 0 };
    const dates = all.map((p) => p.date).sort((a, b) => a.localeCompare(b));
    const maxValue = Math.max(0, ...all.map((p) => p.total));
    return { minDate: dates[0], maxDate: dates[dates.length - 1], maxValue };
  }

  feeTooltip: FeeTooltipState = { visible: false, x: 0, y: 0, color: '#94a3b8', text: '' };

  showFeeTooltip(ev: MouseEvent, host: HTMLElement, color: string, text: string): void {
    this.feeTooltip.visible = true;
    this.feeTooltip.color = color;
    this.feeTooltip.text = text;
    this.moveFeeTooltip(ev, host);
  }

  moveFeeTooltip(ev: MouseEvent, host: HTMLElement): void {
    const rect = host.getBoundingClientRect();
    if (!rect) return;
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    this.feeTooltip.x = Math.max(0, Math.min(rect.width, x));
    this.feeTooltip.y = Math.max(0, Math.min(rect.height, y));
  }

  hideFeeTooltip(): void {
    this.feeTooltip.visible = false;
  }

  /**
   * Each student counted once (by id) even if listed in multiple departments.
   */
  assignedGenderTotals(): AssignedGenderTotals {
    const byId = new Map(this.studentStore.students().map((s) => [s.id, s]));
    const seen = new Set<string>();
    for (const d of this.departmentStore.departments()) {
      for (const sid of d.assignedStudentIds ?? []) {
        const t = String(sid ?? '').trim();
        if (t) seen.add(t);
      }
    }
    let male = 0;
    let female = 0;
    for (const id of seen) {
      const st = byId.get(id);
      if (!st) continue;
      if (st.gender === 'male') male++;
      else female++;
    }
    return { male, female, total: male + female };
  }

  /** CSS conic-gradient for donut (sky = male, #34ca94 = female). */
  genderDonutConic(): string {
    const { male, female, total } = this.assignedGenderTotals();
    if (total === 0) {
      return 'conic-gradient(rgb(51 65 85) 0deg 360deg)';
    }
    const maleDeg = (male / total) * 360;
    return `conic-gradient(
      rgb(56 189 248) 0deg ${maleDeg}deg,
      #34ca94 ${maleDeg}deg 360deg
    )`;
  }

  donutMalePct(): number {
    const { male, total } = this.assignedGenderTotals();
    return total ? Math.round((male / total) * 1000) / 10 : 0;
  }

  donutFemalePct(): number {
    const { female, total } = this.assignedGenderTotals();
    return total ? Math.round((female / total) * 1000) / 10 : 0;
  }

  /** Per department: assigned students only; enrolments (same student in two depts appears twice). */
  departmentGenderRows(): DepartmentGenderRow[] {
    const byId = new Map(this.studentStore.students().map((s) => [s.id, s]));
    const rows = this.departmentStore.departments().map((d) => {
      let male = 0;
      let female = 0;
      for (const sid of d.assignedStudentIds ?? []) {
        const st = byId.get(String(sid ?? '').trim());
        if (!st) continue;
        if (st.gender === 'male') male++;
        else female++;
      }
      const total = male + female;
      return {
        id: d.id,
        name: d.name,
        male,
        female,
        total,
        malePct: total ? (male / total) * 100 : 0,
        femalePct: total ? (female / total) * 100 : 0,
      };
    });
    return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
}
