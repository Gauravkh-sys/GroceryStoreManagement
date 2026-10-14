import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

export type LoginRole = 'manager' | 'customer';

const DEMO_ACCOUNTS: Readonly<
  Record<LoginRole, Readonly<{ mobile: string; password: string }>>
> = {
  customer: { mobile: '8299247386', password: '8299247386' },
  manager: { mobile: '8756587920', password: '8756587920' },
};

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
  readonly signedIn = output<{ role: LoginRole; mobile: string }>();
  readonly role = signal<LoginRole>('customer');
  readonly demoMobile = computed(() => DEMO_ACCOUNTS[this.role()].mobile);
  readonly statusMessage = signal('');
  readonly loginIdentifier = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{10}$/)],
  });
  readonly password = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{10}$/)],
  });

  selectRole(role: LoginRole): void {
    this.role.set(role);
    this.statusMessage.set('');
    this.loginIdentifier.setValidators([
      Validators.required,
      Validators.pattern(/^\d{10}$/),
    ]);
    this.loginIdentifier.reset('');
    this.password.reset('');
  }

  attemptSignIn(): void {
    this.loginIdentifier.markAsTouched();
    this.password.markAsTouched();

    if (this.loginIdentifier.invalid || this.password.invalid) {
      return;
    }

    const account = DEMO_ACCOUNTS[this.role()];
    if (
      this.loginIdentifier.value !== account.mobile ||
      this.password.value !== account.password
    ) {
      this.statusMessage.set('Mobile number or password is incorrect.');
      return;
    }

    this.statusMessage.set('Demo sign-in successful.');
    this.signedIn.emit({ role: this.role(), mobile: account.mobile });
  }
}
