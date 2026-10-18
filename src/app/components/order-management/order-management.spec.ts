import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { createTestOrder } from '../../testing/store-test-data';
import { OrderManagementComponent } from './order-management';

describe('OrderManagementComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [OrderManagementComponent] });
  });

  it('shows the manager status actions in the supported order progression', () => {
    const fixture = TestBed.createComponent(OrderManagementComponent);
    const store = TestBed.inject(GroceryStoreService);
    fixture.componentRef.setInput('manager', true);
    const order = createTestOrder(store);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Start preparing');
    clickButton(fixture.nativeElement, 'Start preparing');
    fixture.detectChanges();
    expect(store.orders()[0].status).toBe('preparing');
    expect(fixture.nativeElement.textContent).toContain('Mark ready');

    clickButton(fixture.nativeElement, 'Mark ready');
    fixture.detectChanges();
    expect(store.orders()[0].status).toBe('ready');
    expect(fixture.nativeElement.textContent).toContain('Mark complete');

    clickButton(fixture.nativeElement, 'Mark complete');
    expect(store.orders()[0].status).toBe('completed');
    expect(store.orders().find((item) => item.id === order.id)?.status).toBe('completed');
  });

  it('limits customer history and reorders the selected order', () => {
    const fixture = TestBed.createComponent(OrderManagementComponent);
    const store = TestBed.inject(GroceryStoreService);
    const order = createTestOrder(store, 'delivery');
    fixture.componentRef.setInput('customerMobile', order.customerMobile);
    fixture.detectChanges();
    let reorderEmitted = false;
    fixture.componentInstance.reorderAdded.subscribe(() => (reorderEmitted = true));

    expect(fixture.componentInstance.visibleOrders()).toEqual([order]);
    expect(fixture.nativeElement.textContent).toContain(order.deliveryAddress);
    clickButton(fixture.nativeElement, 'Reorder');

    expect(reorderEmitted).toBe(true);
    expect(store.cartCount()).toBe(order.items[0].quantity);
  });

  it('shows saved customer accounts and their access source to managers', () => {
    const fixture = TestBed.createComponent(OrderManagementComponent);
    const store = TestBed.inject(GroceryStoreService);
    fixture.componentRef.setInput('manager', true);
    createTestOrder(store);
    store.createCustomerAccount('Saved Shopper', '1234567890');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Customer accounts');
    expect(fixture.nativeElement.textContent).toContain('Saved Shopper');
    expect(fixture.nativeElement.textContent).toContain('1234567890');
    expect(fixture.nativeElement.textContent).toContain('web');
  });
});

function clickButton(root: HTMLElement, label: string): void {
  const button = Array.from(root.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) {
    throw new Error(`Could not find the "${label}" button.`);
  }
  button.click();
}
