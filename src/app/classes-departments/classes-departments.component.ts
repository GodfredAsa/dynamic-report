import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { DepartmentStoreService } from '../data/department-store.service';
import { AppUserStoreService } from '../data/app-user-store.service';
import { StudentStoreService } from '../data/student-store.service';
import { Department, DepartmentInput, toDepartmentInput } from '../data/department.model';

@Component({
  selector: 'app-classes-departments',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './classes-departments.component.html',
})
export class ClassesDepartmentsComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private departmentsStore = inject(DepartmentStoreService);
  private appUserStore = inject(AppUserStoreService);
  private studentStore = inject(StudentStoreService);

  user = this.auth.currentUser;
  departments = this.departmentsStore.departments;
  departmentsLoadError = this.departmentsStore.loadError;
  appUsers = this.appUserStore.users;
  students = this.studentStore.students;

  readonly sampleDepartment: DepartmentInput = {
    name: 'Natural Sciences',
    head: 'Dr. Sarah Jenkins',
    headStaffId: 'usr-2',
    description: 'Science labs and curriculum (sample).',
    classes: [],
    members: 0,
    students: 0,
    location: '',
    status: 'Active',
    assignedStaffIds: [],
    assignedStudentIds: [],
  };

  draft: DepartmentInput = this.emptyDraft();

  formError = '';
  importMessage = '';
  private importFile: File | null = null;

  assignClassDeptId = '';
  assignClassName = '';
  assignClassError = '';

  showDepartmentModal = false;
  editId = '';
  editDraft: DepartmentInput = this.emptyDraft();
  editFormError = '';

  /** Read-only department detail dialog */
  showDepartmentViewModal = false;
  viewDeptId = '';

  showAssignStaffModal = false;
  assignDeptId = '';
  assignSelectedStaffIds: string[] = [];
  assignFormError = '';

  showAssignStudentsModal = false;
  assignStudentsDeptId = '';
  assignSelectedStudentIds: string[] = [];
  assignStudentsFormError = '';

  private emptyDraft(): DepartmentInput {
    return {
      name: '',
      head: '',
      headStaffId: '',
      description: '',
      classes: [],
      members: 0,
      students: 0,
      location: '',
      status: 'Active',
      assignedStaffIds: [],
      assignedStudentIds: [],
    };
  }

  departmentHeadLabel(d: Department): string {
    if (d.headStaffId) {
      const u = this.appUserStore.users().find((x) => x.id === d.headStaffId);
      if (u) return u.displayName;
    }
    return d.head || '—';
  }

  departmentHeadEmail(d: Department): string {
    if (d.headStaffId) {
      const u = this.appUserStore.users().find((x) => x.id === d.headStaffId);
      if (u) return u.email;
    }
    return '';
  }

  /** Current department for the view modal (live from store). */
  viewDepartment(): Department | undefined {
    return this.departmentsStore.departments().find((x) => x.id === this.viewDeptId);
  }

  openViewModal(d: Department): void {
    this.viewDeptId = d.id;
    this.showDepartmentViewModal = true;
  }

  closeViewModal(): void {
    this.showDepartmentViewModal = false;
    this.viewDeptId = '';
  }

  openUpdateFromView(): void {
    const d = this.viewDepartment();
    this.closeViewModal();
    if (d) this.openEditModal(d);
  }

  /** Short label for table: names from staff.json by id. */
  assignedStaffSummary(d: Department): string {
    const ids = d.assignedStaffIds ?? [];
    if (ids.length === 0) return '—';
    const users = this.appUserStore.users();
    return ids
      .map((id) => users.find((u) => u.id === id)?.displayName ?? id)
      .join(', ');
  }

  assignedStudentsSummary(d: Department): string {
    const idSet = new Set<string>();
    for (const id of d.assignedStudentIds ?? []) idSet.add(id);
    for (const c of d.classes ?? []) {
      for (const id of c.assignedStudentIds ?? []) idSet.add(id);
    }
    if (idSet.size === 0) return '—';
    const list = this.studentStore.students();
    return [...idSet]
      .map((id) => list.find((s) => s.id === id)?.displayName ?? id)
      .join(', ');
  }

  openAssignStaffModal(d: Department): void {
    this.assignDeptId = d.id;
    this.assignSelectedStaffIds = [...(d.assignedStaffIds ?? [])];
    this.assignFormError = '';
    this.showAssignStaffModal = true;
  }

  closeAssignStaffModal(): void {
    this.showAssignStaffModal = false;
    this.assignDeptId = '';
    this.assignSelectedStaffIds = [];
    this.assignFormError = '';
  }

  toggleAssignStaffId(staffId: string): void {
    if (this.assignSelectedStaffIds.includes(staffId)) {
      this.assignSelectedStaffIds = this.assignSelectedStaffIds.filter((x) => x !== staffId);
    } else {
      this.assignSelectedStaffIds = [...this.assignSelectedStaffIds, staffId];
    }
  }

  isStaffIdSelected(staffId: string): boolean {
    return this.assignSelectedStaffIds.includes(staffId);
  }

  async saveAssignStaff(): Promise<void> {
    this.assignFormError = '';
    const d = this.departmentsStore.departments().find((x) => x.id === this.assignDeptId);
    if (!d) {
      this.assignFormError = 'Department not found.';
      return;
    }
    const input: DepartmentInput = {
      ...toDepartmentInput(d),
      assignedStaffIds: [...this.assignSelectedStaffIds],
    };
    const before = this.snapshotDepartments();
    const result = this.departmentsStore.update(this.assignDeptId, input);
    if (!result.ok) {
      this.assignFormError = result.error;
      return;
    }
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.assignFormError = commit.error;
      return;
    }
    this.closeAssignStaffModal();
  }

  openAssignStudentsModal(d: Department): void {
    this.assignStudentsDeptId = d.id;
    this.assignSelectedStudentIds = [...(d.assignedStudentIds ?? [])];
    this.assignStudentsFormError = '';
    this.showAssignStudentsModal = true;
  }

  closeAssignStudentsModal(): void {
    this.showAssignStudentsModal = false;
    this.assignStudentsDeptId = '';
    this.assignSelectedStudentIds = [];
    this.assignStudentsFormError = '';
  }

  toggleAssignStudentId(studentId: string): void {
    if (this.assignSelectedStudentIds.includes(studentId)) {
      this.assignSelectedStudentIds = this.assignSelectedStudentIds.filter((x) => x !== studentId);
    } else {
      this.assignSelectedStudentIds = [...this.assignSelectedStudentIds, studentId];
    }
  }

  isStudentIdSelected(studentId: string): boolean {
    return this.assignSelectedStudentIds.includes(studentId);
  }

  async saveAssignStudents(): Promise<void> {
    this.assignStudentsFormError = '';
    const d = this.departmentsStore.departments().find((x) => x.id === this.assignStudentsDeptId);
    if (!d) {
      this.assignStudentsFormError = 'Department not found.';
      return;
    }
    const input: DepartmentInput = {
      ...toDepartmentInput(d),
      assignedStudentIds: [...this.assignSelectedStudentIds],
    };
    const before = this.snapshotDepartments();
    const result = this.departmentsStore.update(this.assignStudentsDeptId, input);
    if (!result.ok) {
      this.assignStudentsFormError = result.error;
      return;
    }
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.assignStudentsFormError = commit.error;
      return;
    }
    this.closeAssignStudentsModal();
  }

  applySample(): void {
    this.draft = { ...this.sampleDepartment };
    this.formError = '';
  }

  private snapshotDepartments(): Department[] {
    return [...this.departmentsStore.departments()];
  }

  async addDepartment(): Promise<void> {
    this.formError = '';
    const before = this.snapshotDepartments();
    const headId = this.draft.headStaffId.trim();
    const headUser = this.appUserStore.users().find((u) => u.id === headId);
    if (!headUser) {
      this.formError = 'Choose a department head from the staff list.';
      return;
    }
    const payload: DepartmentInput = {
      ...this.draft,
      head: headUser.displayName,
      headStaffId: headId,
      classes: [],
    };
    const result = this.departmentsStore.add(payload);
    if (!result.ok) {
      this.formError = result.error;
      return;
    }
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.formError = commit.error;
      return;
    }
    this.draft = this.emptyDraft();
  }

  openEditModal(d: Department): void {
    this.editId = d.id;
    this.editDraft = toDepartmentInput(d);
    this.editFormError = '';
    this.showDepartmentModal = true;
  }

  closeEditModal(): void {
    this.showDepartmentModal = false;
    this.editId = '';
    this.editFormError = '';
    this.editDraft = this.emptyDraft();
  }

  async saveDepartmentEdit(): Promise<void> {
    this.editFormError = '';
    const before = this.snapshotDepartments();
    const headId = this.editDraft.headStaffId.trim();
    const headUser = this.appUserStore.users().find((u) => u.id === headId);
    if (!headUser) {
      this.editFormError = 'Choose a department head from the staff list.';
      return;
    }
    const payload: DepartmentInput = {
      ...this.editDraft,
      head: headUser.displayName,
      headStaffId: headId,
    };
    const result = this.departmentsStore.update(this.editId, payload);
    if (!result.ok) {
      this.editFormError = result.error;
      return;
    }
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.editFormError = commit.error;
      return;
    }
    this.closeEditModal();
  }

  async removeDepartment(id: string): Promise<void> {
    this.importMessage = '';
    const before = this.snapshotDepartments();
    this.departmentsStore.remove(id);
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.importMessage = commit.error;
    }
    if (this.showDepartmentViewModal && this.viewDeptId === id) {
      this.closeViewModal();
    }
  }

  exportJson(): void {
    this.departmentsStore.exportDownload();
  }

  async reloadDepartmentsFromFile(): Promise<void> {
    this.importMessage = '';
    await this.departmentsStore.reloadFromDepartmentsFile();
    this.importMessage = 'Reloaded from public/data/departments.json.';
  }

  onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.importFile = input.files?.[0] ?? null;
  }

  async runImport(replace: boolean): Promise<void> {
    this.importMessage = '';
    if (!this.importFile) {
      this.importMessage = 'Choose a JSON file first.';
      return;
    }
    const before = this.snapshotDepartments();
    try {
      const text = await this.importFile.text();
      const parsed = this.departmentsStore.parseImportFile(text);
      if (!parsed.ok) {
        this.importMessage = parsed.error;
        return;
      }
      if (replace) {
        this.departmentsStore.replaceAll(parsed.data);
      } else {
        this.departmentsStore.mergeImport(parsed.data);
      }
      const commit = await this.departmentsStore.commitAndReload();
      if (!commit.ok) {
        this.departmentsStore.restoreInMemory(before);
        this.importMessage = commit.error;
        return;
      }
      this.importMessage = replace
        ? `Saved ${parsed.data.length} department(s) to file and reloaded.`
        : `Merged import, saved to file, and reloaded.`;
    } catch {
      this.importMessage = 'Could not read file.';
    }
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  async submitAssignClass(): Promise<void> {
    this.assignClassError = '';
    this.importMessage = '';
    if (!this.assignClassDeptId.trim()) {
      this.assignClassError = 'Choose a department.';
      return;
    }
    const before = this.snapshotDepartments();
    const result = this.departmentsStore.addClassToDepartment(this.assignClassDeptId, this.assignClassName);
    if (!result.ok) {
      this.assignClassError = result.error;
      return;
    }
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.assignClassError = commit.error;
      return;
    }
    this.assignClassName = '';
    this.importMessage = 'Class added to department and saved to departments.json.';
  }

  async removeDepartmentClass(d: Department, classId: string): Promise<void> {
    if (!window.confirm(`Remove this class from ${d.name}?`)) {
      return;
    }
    this.importMessage = '';
    this.assignClassError = '';
    const before = this.snapshotDepartments();
    const result = this.departmentsStore.removeClassFromDepartment(d.id, classId);
    if (!result.ok) {
      this.importMessage = result.error;
      return;
    }
    const commit = await this.departmentsStore.commitAndReload();
    if (!commit.ok) {
      this.departmentsStore.restoreInMemory(before);
      this.importMessage = commit.error;
      return;
    }
    this.importMessage = 'Class removed and saved to departments.json.';
  }
}
