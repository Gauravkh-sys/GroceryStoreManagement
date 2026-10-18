import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoginScreenComponent } from './login-screen';

describe('LoginScreenComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [LoginScreenComponent] }));

  it('emits the matching customer or manager demo account', () => {
    const fixture = TestBed.createComponent(LoginScreenComponent);
    const signedIn: { role: string; mobile: string }[] = [];
    fixture.componentInstance.signedIn.subscribe((session) => signedIn.push(session));

    fixture.componentInstance.loginIdentifier.setValue('8299247386');
    fixture.componentInstance.password.setValue('8299247386');
    fixture.componentInstance.attemptSignIn();
    expect(signedIn).toEqual([{ role: 'customer', mobile: '8299247386' }]);

    fixture.componentInstance.selectRole('manager');
    expect(fixture.componentInstance.demoMobile()).toBe('8756587920');
    fixture.componentInstance.loginIdentifier.setValue('8756587920');
    fixture.componentInstance.password.setValue('8756587920');
    fixture.componentInstance.attemptSignIn();
    expect(signedIn[1]).toEqual({ role: 'manager', mobile: '8756587920' });
  });

  it('does not emit for invalid or incorrect credentials and emits browse requests', () => {
    const fixture = TestBed.createComponent(LoginScreenComponent);
    const signedIn: unknown[] = [];
    let browseRequested = false;
    fixture.componentInstance.signedIn.subscribe((session) => signedIn.push(session));
    fixture.componentInstance.browseStore.subscribe(() => (browseRequested = true));

    fixture.componentInstance.attemptSignIn();
    expect(fixture.componentInstance.loginIdentifier.touched).toBe(true);
    expect(signedIn).toHaveLength(0);

    fixture.componentInstance.loginIdentifier.setValue('1111111111');
    fixture.componentInstance.password.setValue('1111111111');
    fixture.componentInstance.attemptSignIn();
    expect(fixture.componentInstance.statusMessage()).toBe(
      'Mobile number or password is incorrect.',
    );
    expect(signedIn).toHaveLength(0);

    fixture.componentInstance.browseStore.emit();
    expect(browseRequested).toBe(true);
  });
});
