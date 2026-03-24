import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { StudentStoreService, STUDENTS_JSON_PATH } from '../data/student-store.service';
import { DepartmentStoreService } from '../data/department-store.service';
import { Department } from '../data/department.model';
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
  /** Assign student → department (class); starts collapsed. */
  assignSectionOpen = false;
  assignPickStudentId = '';
  assignPickDeptId = '';
  assignToDeptError = '';
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

  /** Departments that include this student id (for the table). */
  departmentsSummaryForStudent(studentId: string): string {
    const id = studentId.trim();
    const depts = this.departmentStore.departments().filter((d) =>
      (d.assignedStudentIds ?? []).includes(id),
    );
    if (depts.length === 0) return '—';
    return depts.map((d) => d.name).join(', ');
  }

  async assignToDepartment(): Promise<void> {
    this.assignToDeptError = '';
    this.actionMessage = '';
    if (!this.assignPickStudentId?.trim() || !this.assignPickDeptId?.trim()) {
      this.assignToDeptError = 'Choose both a student and a department.';
      return;
    }
    const before = this.snapshotDepartments();
    const result = this.departmentStore.addStudentToDepartment(
      this.assignPickDeptId,
      this.assignPickStudentId,
    );
    if (!result.ok) {
      this.assignToDeptError = result.error;
      return;
    }
    const commit = await this.departmentStore.commitAndReload();
    if (!commit.ok) {
      this.departmentStore.restoreInMemory(before);
      this.assignToDeptError = commit.error;
      return;
    }
    this.actionMessage = 'Student linked to department. Saved to public/data/departments.json.';
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

  async saveStudentEdit(): Promise<void> {
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
