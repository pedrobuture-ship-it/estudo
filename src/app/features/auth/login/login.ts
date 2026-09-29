import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  name = '';
  
  isRegistering = false;
  isLoading = false;
  errorMessage = '';

  toggleMode() {
    this.isRegistering = !this.isRegistering;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  async onSubmit() {
    if (!this.email || !this.password || (this.isRegistering && !this.name)) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      if (this.isRegistering) {
        const res = await this.authService.signUpWithEmail(this.email, this.password, this.name);
        if (res.session) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Conta criada com sucesso! Se você não conseguir entrar em seguida, confirme seu e-mail ou desative a confirmação de e-mail no Supabase.';
          setTimeout(() => {
            this.toggleMode();
          }, 3000);
        }
      } else {
        await this.authService.signInWithEmail(this.email, this.password);
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Ocorreu um erro na autenticação.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
