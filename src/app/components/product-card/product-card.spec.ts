import { TestBed } from '@angular/core/testing';
import { INITIAL_PRODUCTS } from '../../data/grocery-data';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductCardComponent } from './product-card';

describe('ProductCardComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ProductCardComponent] }));

  it('renders the product and emits add and favorite actions', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    const product = { ...INITIAL_PRODUCTS[0], lowStockThreshold: 12 };
    fixture.componentRef.setInput('product', product);
    fixture.componentRef.setInput('favoriteEnabled', true);
    const added: string[] = [];
    const favorited: string[] = [];
    fixture.componentInstance.add.subscribe((id) => added.push(id));
    fixture.componentInstance.favoriteToggle.subscribe((id) => favorited.push(id));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(product.name);
    fixture.nativeElement.querySelector('.add-button').click();
    fixture.nativeElement.querySelector('[aria-pressed="false"]').click();
    expect(added).toEqual([product.id]);
    expect(favorited).toEqual([product.id]);
  });

  it('disables adding an out-of-stock item', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', {
      ...INITIAL_PRODUCTS[0],
      stock: 0,
      lowStockThreshold: 12,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Out of stock');
    expect(fixture.nativeElement.querySelector('.add-button').disabled).toBe(true);
  });
});
