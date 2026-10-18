import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { createTestOrder } from '../../testing/store-test-data';
import { LoginScreenComponent } from './login-screen';

describe('LoginScreenComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [LoginScreenComponent] });
  });

  it('emits the matching customer or manager demo account', () => {
    const fixture = TestBed.createComponent(LoginScreenComponent);
    const signedIn: { role: string; mobile: string; name: string }[] = [];
    fixture.componentInstance.signedIn.subscribe((session) => signedIn.push(session));

    fixture.componentInstance.loginIdentifier.setValue('8299247386');
    fixture.componentInstance.password.setValue('8299247386');
    fixture.componentInstance.attemptSignIn();
    expect(signedIn).toEqual([
      { role: 'customer', mobile: '8299247386', name: '' },
    ]);

    fixture.componentInstance.selectRole('manager');
    expect(fixture.componentInstance.demoMobile()).toBe('8756587920');
    fixture.componentInstance.loginIdentifier.setValue('8756587920');
    fixture.componentInstance.password.setValue('8756587920');
    fixture.componentInstance.attemptSignIn();
    expect(signedIn[1]).toEqual({
      role: 'manager',
      mobile: '8756587920',
      name: '',
    });
  });

  it('signs in a first-order customer account with the mobile as its demo password', () => {
    const store = TestBed.inject(GroceryStoreService);
    createTestOrder(store);
    store.createCustomerAccount('Saved Shopper', '1234567890');
    const fixture = TestBed.createComponent(LoginScreenComponent);
    const signedIn: { role: string; mobile: string; name: string }[] = [];
    fixture.componentInstance.signedIn.subscribe((session) => signedIn.push(session));

    fixture.componentInstance.loginIdentifier.setValue('1234567890');
    fixture.componentInstance.password.setValue('0000000000');
    fixture.componentInstance.attemptSignIn();
    expect(signedIn).toHaveLength(0);

    fixture.componentInstance.password.setValue('1234567890');
    fixture.componentInstance.attemptSignIn();
    expect(signedIn).toEqual([
      { role: 'customer', mobile: '1234567890', name: 'Saved Shopper' },
    ]);
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
