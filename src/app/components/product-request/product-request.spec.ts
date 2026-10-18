import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { ProductRequestComponent } from './product-request';

describe('ProductRequestComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [ProductRequestComponent] });
  });

  it('submits a valid request, stores it, and resets the form', () => {
    const fixture = TestBed.createComponent(ProductRequestComponent);
    const store = TestBed.inject(GroceryStoreService);
    const component = fixture.componentInstance;
    component.requestForm.setValue({
      productName: 'Mango pickle',
      details: 'Small jar',
      customerName: 'Asha',
      customerMobile: '1234567890',
    });

    component.submitRequest();

    expect(store.productRequests()[0]).toMatchObject({
      productName: 'Mango pickle',
      details: 'Small jar',
      customerName: 'Asha',
      customerMobile: '1234567890',
      status: 'pending',
    });
    expect(component.message()).toBe('Product request sent to the store manager.');
    expect(component.requestForm.controls.productName.value).toBe('');
  });

  it('marks invalid fields and does not store an incomplete request', () => {
    const fixture = TestBed.createComponent(ProductRequestComponent);
    const store = TestBed.inject(GroceryStoreService);

    fixture.componentInstance.submitRequest();

    expect(fixture.componentInstance.requestForm.controls.productName.touched).toBe(true);
    expect(store.productRequests()).toHaveLength(0);
  });
});
