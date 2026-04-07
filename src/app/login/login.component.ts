import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  errorMessage = '';

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    const u = this.username.trim();
    const p = this.password;
    if (!u) {
      this.errorMessage = 'Please enter your email.';
      return;
    }
    if (!p) {
      this.errorMessage = 'Please enter your password.';
      return;
    }
    if (await this.auth.login(u, p)) {
      void this.router.navigateByUrl('/modules');
      return;
    }
    this.errorMessage = 'Invalid email or password. Please try again.';
  }

  clearError(): void {
    if (this.errorMessage) this.errorMessage = '';
  }
}
