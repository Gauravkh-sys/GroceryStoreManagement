import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from './services/grocery-store.service';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [App] });
  });

  it('browses as a guest and filters products by price and availability', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const browseButton = Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Browse the store without signing in'),
    );
    if (!browseButton) {
      throw new Error('The guest browsing action was not rendered.');
    }
    browseButton.click();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const store = TestBed.inject(GroceryStoreService);

    component.minPriceControl.setValue('2');
    component.maxPriceControl.setValue('3');
    expect(component.filteredProducts().length).toBeGreaterThan(0);
    expect(
      component.filteredProducts().every((product) => product.price >= 2 && product.price <= 3),
    ).toBe(true);

    component.minPriceControl.setValue('4');
    component.maxPriceControl.setValue('2');
    expect(component.invalidPriceRange()).toBe(true);
    expect(component.filteredProducts()).toEqual([]);

    component.minPriceControl.setValue('');
    component.maxPriceControl.setValue('');
    component.onlyInStock.set(true);
    store.addProduct({
      name: 'Unavailable item',
      category: 'Vegetables & Fruits',
      price: 1,
      stock: 0,
      lowStockThreshold: 1,
      icon: '🥕',
      unit: 'item',
    });
    expect(component.filteredProducts().some((product) => product.stock === 0)).toBe(false);
  });

  it('saves customer favorites, resets filters, and completes delivery checkout', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const store = TestBed.inject(GroceryStoreService);
    component.completeDemoLogin({ role: 'customer', mobile: '1234567890' });
    const product = store.products()[0];
    component.toggleFavorite(product.id);
    expect(component.favoriteProductIds().has(product.id)).toBe(true);

    component.searchControl.setValue('bananas');
    component.minPriceControl.setValue('5');
    component.showFavoritesOnly.set(true);
    component.clearAllFilters();
    expect(component.searchControl.value).toBe('');
    expect(component.minPriceControl.value).toBe('');
    expect(component.showFavoritesOnly()).toBe(false);

    store.addToCart(product.id);
    component.checkoutName.setValue('Test shopper');
    component.checkoutMobile.setValue('1234567890');
    component.checkoutFulfillment.setValue('delivery');
    component.placeOrder();
    expect(store.orders()).toHaveLength(0);
    expect(store.getCustomerAccount('1234567890')).toBeUndefined();
    expect(component.checkoutAddress.touched).toBe(true);

    component.checkoutAddress.setValue('12 Test Street');
    component.placeOrder();
    expect(store.getCustomerAccount('1234567890')?.name).toBe('Test shopper');
    expect(component.orderAccountNotice()).toContain('account was created');
    expect(component.selectedBill()?.fulfillmentMethod).toBe('delivery');
    expect(component.selectedBill()?.deliveryAddress).toBe('12 Test Street');
    expect(component.isCartOpen()).toBe(false);
  });
});
