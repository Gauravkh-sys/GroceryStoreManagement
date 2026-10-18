import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from './grocery-store.service';
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
