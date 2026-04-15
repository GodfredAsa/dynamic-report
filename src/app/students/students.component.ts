import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminContextService } from '../auth/admin-context.service';
import { PermissionsService } from '../auth/permissions.service';
import { StudentStoreService, STUDENTS_JSON_PATH } from '../data/student-store.service';
import { DepartmentStoreService } from '../data/department-store.service';
import { Department, DepartmentClass } from '../data/department.model';
import { Student, STUDENT_GENDERS } from '../data/student.model';

@Component({
  selector: 'app-students',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './students.component.html',
})
export class StudentsComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private studentStore = inject(StudentStoreService);
  private departmentStore = inject(DepartmentStoreService);
  readonly perms = inject(PermissionsService);
  readonly adminCtx = inject(AdminContextService);

  user = this.auth.currentUser;
  students = this.studentStore.students;
  loaded = this.studentStore.loaded;
  studentsLoadError = this.studentStore.loadError;
  departments = this.departmentStore.departments;

  readonly studentsJsonPath = STUDENTS_JSON_PATH;
  readonly dataDirHint = 'public/data/students.json';
  readonly genders = STUDENT_GENDERS;

  actionMessage = '';
  addFormError = '';
  addSectionOpen = false;
  /** Assign student → class within a department; starts collapsed. */
  assignSectionOpen = false;
  assignPickStudentId = '';
  assignPickDeptId = '';
  assignPickClassId = '';
  assignToClassError = '';
  dataToolsSectionOpen = false;
  studentsListSectionOpen = false;
  private importFile: File | null = null;

  showStudentModal = false;
  studentEditId = '';
  editStudent: Omit<Student, 'id'> = this.emptyNewStudent();
  editStudentError = '';

  newStudent: Omit<Student, 'id'> = this.emptyNewStudent();

  private emptyNewStudent(): Omit<Student, 'id'> {
    return {
      displayName: '',
      gender: 'male',
      guardianName: '',
      guardianPhone: '',
    };
  }

  private snapshotStudents(): Student[] {
    return [...this.studentStore.students()];
  }

  private snapshotDepartments(): Department[] {
    return [...this.departmentStore.departments()];
  }

  sortedDepartments(): Department[] {
    return [...this.departmentStore.departments()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  /** Class and department rosters that include this student (for the table). */
  classesSummaryForStudent(studentId: string): string {
    const id = studentId.trim();
    if (!id) return '—';
    const parts: string[] = [];
    for (const d of this.departmentStore.departments()) {
      for (const c of d.classes ?? []) {
        if ((c.assignedStudentIds ?? []).includes(id)) {
          parts.push(`${d.name}: ${c.name}`);
        }
      }
      if ((d.assignedStudentIds ?? []).includes(id)) {
        parts.push(`${d.name} (department roster)`);
      }
    }
    if (parts.length === 0) return '—';
    return [...new Set(parts)].join(', ');
  }

  onAssignDepartmentChange(): void {
    this.assignPickClassId = '';
  }

  classesForAssignDepartment(): DepartmentClass[] {
    const d = this.departmentStore.departments().find((x) => x.id === this.assignPickDeptId);
    return d?.classes ?? [];
  }

  async assignStudentToClass(): Promise<void> {
    if (!this.perms.canWrite()) {
      this.assignToClassError = 'View-only access: you cannot assign students.';
      return;
    }
    this.assignToClassError = '';
    this.actionMessage = '';
    if (!this.assignPickStudentId?.trim() || !this.assignPickDeptId?.trim()) {
      this.assignToClassError = 'Choose a student and a department.';
      return;
    }
    if (!this.assignPickClassId?.trim()) {
      this.assignToClassError = 'Choose a class.';
      return;
    }
    const before = this.snapshotDepartments();
    const result = this.departmentStore.addStudentToClass(
      this.assignPickDeptId,
      this.assignPickClassId,
      this.assignPickStudentId,
    );
    if (!result.ok) {
      this.assignToClassError = result.error;
      return;
    }
    const commit = await this.departmentStore.commitAndReload();
    if (!commit.ok) {
      this.departmentStore.restoreInMemory(before);
      this.assignToClassError = commit.error;
      return;
    }
    this.actionMessage = 'Student assigned to class. Saved to public/data/departments.json.';
  }

  genderLabel(g: string): string {
    return g === 'male' ? 'Male' : g === 'female' ? 'Female' : g;
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  openStudentModal(s: Student): void {
    this.studentEditId = s.id;
    this.editStudent = {
      displayName: s.displayName,
      gender: s.gender,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
    };
    this.editStudentError = '';
    this.showStudentModal = true;
  }

  closeStudentModal(): void {
    this.showStudentModal = false;
    this.studentEditId = '';
    this.editStudentError = '';
    this.editStudent = this.emptyNewStudent();
  }

  async deleteStudentMember(s: Student): Promise<void> {
    if (!this.adminCtx.inSetup()) {
      return;
    }
    if (!this.perms.canWrite()) {
      this.actionMessage = 'View-only access: you cannot delete students. Use SETUP as an admin.';
      return;
    }
    if (
      !window.confirm(
        `Remove ${s.displayName} (${s.id}) from students and all class rosters? This cannot be undone after saving.`,
      )
    ) {
      return;
    }
    this.actionMessage = '';
    const beforeStudents = this.snapshotStudents();
    const beforeDepartments = this.snapshotDepartments();

    this.departmentStore.removeStudentIdEverywhere(s.id);
    const deptCommit = await this.departmentStore.commitAndReload();
    if (!deptCommit.ok) {
      this.departmentStore.restoreInMemory(beforeDepartments);
      this.actionMessage = deptCommit.error;
      return;
    }

    this.studentStore.removeStudent(s.id);
    const studentCommit = await this.studentStore.commitStudentsAndReload();
    if (!studentCommit.ok) {
      this.studentStore.restoreInMemory(beforeStudents);
      this.actionMessage = studentCommit.error;
      return;
    }

    if (this.showStudentModal && this.studentEditId === s.id) {
      this.closeStudentModal();
    }
    this.actionMessage =
      'Student removed from public/data/students.json; rosters updated in public/data/departments.json.';
  }

  async saveStudentEdit(): Promise<void> {
    if (!this.perms.canWrite()) {
      this.editStudentError = 'View-only access: you cannot edit students.';
      return;
    }
    this.editStudentError = '';
    this.actionMessage = '';
    const before = this.snapshotStudents();
    const result = this.studentStore.updateStudent(this.studentEditId, {
      ...this.editStudent,
      displayName: this.editStudent.displayName.trim(),
      guardianName: this.editStudent.guardianName.trim(),
      guardianPhone: this.editStudent.guardianPhone.trim(),
    });
    if (!result.ok) {
      this.editStudentError = result.error;
      return;
    }
    const commit = await this.studentStore.commitStudentsAndReload();
    if (!commit.ok) {
      this.studentStore.restoreInMemory(before);
      this.editStudentError = commit.error;
      return;
    }
    this.actionMessage = 'Student updated and saved to public/data/students.json.';
    this.closeStudentModal();
  }

  async addStudentRow(): Promise<void> {
    if (!this.perms.canWrite()) {
      this.addFormError = 'View-only access: you cannot add students.';
      return;
    }
    this.addFormError = '';
    this.actionMessage = '';
    const before = this.snapshotStudents();
    const result = this.studentStore.addStudent({
      ...this.newStudent,
      displayName: this.newStudent.displayName.trim(),
      guardianName: this.newStudent.guardianName.trim(),
      guardianPhone: this.newStudent.guardianPhone.trim(),
    });
    if (!result.ok) {
      this.addFormError = result.error;
      return;
    }
    const commit = await this.studentStore.commitStudentsAndReload();
    if (!commit.ok) {
      this.studentStore.restoreInMemory(before);
      this.addFormError = commit.error;
      return;
    }
    this.newStudent = this.emptyNewStudent();
    this.actionMessage = 'Student added and saved to public/data/students.json.';
  }

  exportStudents(): void {
    this.actionMessage = '';
    this.studentStore.exportStudentsDownload();
    this.actionMessage = 'Download started (students.json).';
  }

  async reloadFromBundledFile(): Promise<void> {
    this.actionMessage = '';
    try {
      await this.studentStore.reloadFromStudentsFile();
      this.actionMessage = 'Reloaded from public/data/students.json.';
    } catch {
      this.actionMessage = 'Could not load data/students.json. Check that the file exists under public/data/.';
    }
  }

  onImportSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.importFile = input.files?.[0] ?? null;
  }

  async applyImport(): Promise<void> {
    this.actionMessage = '';
    if (!this.importFile) {
      this.actionMessage = 'Choose a students.json file first.';
      return;
    }
    try {
      const text = await this.importFile.text();
      const parsed = this.studentStore.parseStudentsJson(text);
      if (!parsed.ok) {
        this.actionMessage = parsed.error;
        return;
      }
      this.studentStore.replaceAllInMemory(parsed.data);
      this.actionMessage = `Loaded ${parsed.data.length} row(s) in memory. Download students.json or use Add + save with data-api to persist.`;
    } catch {
      this.actionMessage = 'Could not read file.';
    }
  }
}
