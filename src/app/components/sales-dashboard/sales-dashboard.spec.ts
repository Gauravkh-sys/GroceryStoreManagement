import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { createTestOrder } from '../../testing/store-test-data';
import { SalesDashboardComponent } from './sales-dashboard';

describe('SalesDashboardComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [SalesDashboardComponent] });
  });

  it('aggregates completed sales and ranks products by quantity sold', () => {
    const fixture = TestBed.createComponent(SalesDashboardComponent);
    const store = TestBed.inject(GroceryStoreService);
    const firstOrder = createTestOrder(store);
    store.updateOrderStatus(firstOrder.id, 'preparing');
    store.updateOrderStatus(firstOrder.id, 'ready');
    store.updateOrderStatus(firstOrder.id, 'completed');

    const secondOrder = createTestOrder(store);
    store.updateOrderStatus(secondOrder.id, 'preparing');
    store.updateOrderStatus(secondOrder.id, 'ready');
    store.updateOrderStatus(secondOrder.id, 'completed');

    expect(fixture.componentInstance.completedOrders()).toHaveLength(2);
    expect(fixture.componentInstance.completedRevenue()).toBe(firstOrder.total + secondOrder.total);
    expect(fixture.componentInstance.todayRevenue()).toBe(firstOrder.total + secondOrder.total);
    expect(fixture.componentInstance.topProducts()[0].quantity).toBe(2);
  });

  it('does not include non-completed orders in completed sales', () => {
    const fixture = TestBed.createComponent(SalesDashboardComponent);
    const store = TestBed.inject(GroceryStoreService);
    createTestOrder(store);

    expect(fixture.componentInstance.completedRevenue()).toBe(0);
    expect(fixture.componentInstance.pendingOrders()).toBe(1);
    expect(fixture.componentInstance.topProducts()).toEqual([]);
  });
});
