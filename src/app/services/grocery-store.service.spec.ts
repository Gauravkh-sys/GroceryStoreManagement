import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectCustomerAccessSource,
  GroceryStoreService,
} from './grocery-store.service';
import { createTestOrder } from '../testing/store-test-data';

describe('GroceryStoreService', () => {
  let store: GroceryStoreService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(GroceryStoreService);
  });

  it('keeps favorites associated with a validated customer mobile', () => {
    const product = store.products()[0];

    expect(store.toggleFavorite(product.id, 'not-a-mobile')).toBe(false);
    expect(store.toggleFavorite(product.id, '1234567890')).toBe(true);
    expect(store.favoriteIds('1234567890').has(product.id)).toBe(true);
    expect(store.favoriteIds('0987654321').has(product.id)).toBe(false);
    expect(store.toggleFavorite(product.id, '1234567890')).toBe(true);
    expect(store.favoriteIds('1234567890').has(product.id)).toBe(false);
  });

  it('detects device and browser and creates a normalized account only once', () => {
    expect(
      detectCustomerAccessSource(
        'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
      ),
    ).toEqual({ device: 'mobile', browser: 'Chrome' });
    expect(
      detectCustomerAccessSource(
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edg/124.0.0.0',
      ),
    ).toEqual({ device: 'web', browser: 'Microsoft Edge' });

    expect(store.createCustomerAccount('Test Customer', '1234567890')).toBeNull();
    createTestOrder(store);
    expect(store.createCustomerAccount('  Test Customer ', '123-456-7890')).toMatchObject({
      created: true,
      account: {
        name: 'Test Customer',
        mobile: '1234567890',
        source: { device: 'web' },
      },
    });
    expect(store.createCustomerAccount('Other Name', '1234567890')).toMatchObject({
      created: false,
      account: { name: 'Test Customer' },
    });
    expect(store.createCustomerAccount('Invalid', '123')).toBeNull();
  });

  it('persists accounts in the store snapshot and restores them', () => {
    createTestOrder(store);
    store.createCustomerAccount('Saved Shopper', '1234567890');
    TestBed.flushEffects();
    const snapshot = JSON.parse(
      window.localStorage.getItem('durvijay-store-demo-v1') ?? '{}',
    ) as { customerAccounts?: unknown[] };
    expect(snapshot.customerAccounts).toHaveLength(1);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restoredStore = TestBed.inject(GroceryStoreService);
    expect(restoredStore.getCustomerAccount('1234567890')?.name).toBe('Saved Shopper');
  });

  it('migrates older store snapshots that do not contain customer accounts', () => {
    TestBed.flushEffects();
    const snapshot = JSON.parse(
      window.localStorage.getItem('durvijay-store-demo-v1') ?? '{}',
    ) as Record<string, unknown>;
    delete snapshot['customerAccounts'];
    window.localStorage.setItem('durvijay-store-demo-v1', JSON.stringify(snapshot));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restoredStore = TestBed.inject(GroceryStoreService);
    expect(restoredStore.customerAccounts()).toEqual([]);
  });

  it('reserves stock for orders and restores it when an active order is cancelled', () => {
    const product = store.products()[0];
    const originalStock = product.stock;
    const order = createTestOrder(store);

    expect(store.products().find((item) => item.id === product.id)?.stock).toBe(originalStock - 1);
    expect(store.updateOrderStatus(order.id, 'completed')).toBe(false);
    expect(store.updateOrderStatus(order.id, 'preparing')).toBe(true);
    expect(store.updateOrderStatus(order.id, 'cancelled')).toBe(true);
    expect(store.products().find((item) => item.id === product.id)?.stock).toBe(originalStock);
  });

  it('adds prior order quantities to the basket only when current stock is sufficient', () => {
    const order = createTestOrder(store);
    expect(store.reorderOrder(order.id)).toBe(true);
    expect(store.cartCount()).toBe(1);

    store.removeFromCart(order.items[0].productId);
    const product = store.products().find((item) => item.id === order.items[0].productId);
    if (!product) {
      throw new Error('Expected the ordered product to remain in the catalog.');
    }
    expect(store.updateProduct(product.id, { ...product, stock: 0 })).toBe(true);
    expect(store.reorderOrder(order.id)).toBe(false);
    expect(store.cartCount()).toBe(0);
  });
});
