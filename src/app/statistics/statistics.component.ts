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
