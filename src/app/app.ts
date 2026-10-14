import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InventoryPanelComponent } from './components/inventory-panel/inventory-panel';
import { ProductCardComponent } from './components/product-card/product-card';
import { CATEGORIES, ProductCategory } from './models/grocery.model';
import { GroceryStoreService } from './services/grocery-store.service';

type StoreView = 'shop' | 'inventory';
type CategoryFilter = 'All' | ProductCategory;

@Component({
  selector: 'app-root',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    ProductCardComponent,
    InventoryPanelComponent,
  ],
  templateUrl: './app.html',
})
export class App {
  readonly store = inject(GroceryStoreService);
  readonly categories: readonly CategoryFilter[] = ['All', ...CATEGORIES];
  readonly activeView = signal<StoreView>('shop');
  readonly selectedCategory = signal<CategoryFilter>('All');
  readonly isCartOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchText = toSignal(this.searchControl.valueChanges, {
    initialValue: this.searchControl.value,
  });
  readonly filteredProducts = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchText().trim().toLocaleLowerCase();
    return this.store.products().filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch = product.name.toLocaleLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  });
  readonly inventoryCount = computed(() =>
    this.store.products().reduce((count, product) => count + product.stock, 0),
  );
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  selectCategory(category: CategoryFilter): void {
    this.selectedCategory.set(category);
  }

  addToCart(productId: string): void {
    const added = this.store.addToCart(productId);
    this.showToast(
      added ? 'Added to your basket' : 'Sorry, this item is out of stock',
    );
  }

  changeQuantity(productId: string, quantity: number): void {
    if (!this.store.updateCartQuantity(productId, quantity)) {
      this.showToast('That quantity is not available in stock');
    }
  }

  checkout(): void {
    if (!this.store.checkout()) {
      this.showToast('Your basket could not be checked out. Please try again.');
      return;
    }

    this.isCartOpen.set(false);
    this.showToast('Order placed! Thanks for shopping fresh.');
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer !== undefined) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3200);
  }
}
