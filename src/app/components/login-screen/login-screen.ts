import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

type LoginRole = 'manager' | 'customer';

@Component({
  selector: 'app-login-screen',
  imports: [ReactiveFormsModule],
  templateUrl: './login-screen.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginScreenComponent {
  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly browseStore = output<void>();
  readonly role = signal<LoginRole>('customer');
  readonly statusMessage = signal('');
  readonly loginIdentifier = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly password = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(8)],
  });

  selectRole(role: LoginRole): void {
    this.role.set(role);
    this.statusMessage.set('');
    this.loginIdentifier.setValidators(
      role === 'manager'
        ? [Validators.required, Validators.email]
        : [Validators.required],
    );
    this.loginIdentifier.reset('');
    this.password.reset('');
  }

  attemptSignIn(): void {
    this.loginIdentifier.markAsTouched();
    this.password.markAsTouched();

    if (this.loginIdentifier.invalid || this.password.invalid) {
      return;
    }

    this.statusMessage.set(
      'Sign-in is not connected yet. No account was created or signed in.',
    );
  }
}
