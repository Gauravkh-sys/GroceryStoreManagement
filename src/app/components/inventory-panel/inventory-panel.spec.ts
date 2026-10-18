import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { InventoryPanelComponent } from './inventory-panel';

describe('InventoryPanelComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [InventoryPanelComponent] });
  });

  it('adds a product and includes it in low-stock alerts by its threshold', () => {
    const fixture = TestBed.createComponent(InventoryPanelComponent);
    const store = TestBed.inject(GroceryStoreService);
    fixture.componentInstance.productForm.setValue({
      name: 'Test Oats',
      category: 'Vegetables & Fruits',
      price: 4,
      stock: 3,
      lowStockThreshold: 3,
      icon: '🥣',
      unit: 'item',
    });

    fixture.componentInstance.addProduct();

    const product = store.products().find((item) => item.name === 'Test Oats');
    expect(product).toBeDefined();
    expect(fixture.componentInstance.lowStockProducts()).toContain(product);
  });

  it('edits an existing product and cancels an edit cleanly', () => {
    const fixture = TestBed.createComponent(InventoryPanelComponent);
    const store = TestBed.inject(GroceryStoreService);
    const product = store.products()[0];
    fixture.componentInstance.editProduct(product.id);
    fixture.componentInstance.productForm.controls.name.setValue('Updated bananas');
    fixture.componentInstance.addProduct();

    expect(store.products().find((item) => item.id === product.id)?.name).toBe('Updated bananas');
    expect(fixture.componentInstance.editingProductId()).toBeNull();

    fixture.componentInstance.editProduct(product.id);
    fixture.componentInstance.cancelEdit();
    expect(fixture.componentInstance.productForm.controls.name.value).toBe('');
  });
});
