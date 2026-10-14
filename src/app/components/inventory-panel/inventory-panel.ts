import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CATEGORIES } from '../../models/grocery.model';
import { GroceryStoreService } from '../../services/grocery-store.service';

@Component({
  selector: 'app-inventory-panel',
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './inventory-panel.html',
})
export class InventoryPanelComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly store = inject(GroceryStoreService);
  readonly categories = CATEGORIES;

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    category: [CATEGORIES[0], Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [1, [Validators.required, Validators.min(0), Validators.max(9999)]],
    icon: ['🛒', Validators.required],
    unit: ['item', [Validators.required, Validators.maxLength(30)]],
  });

  get lowStockCount(): number {
    return this.store.products().filter((product) => product.stock <= 12).length;
  }

  addProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.store.addProduct(this.productForm.getRawValue());
    this.productForm.reset({
      name: '',
      category: CATEGORIES[0],
      price: 0,
      stock: 1,
      icon: '🛒',
      unit: 'item',
    });
  }

  deleteProduct(productId: string): void {
    this.store.deleteProduct(productId);
  }
}
