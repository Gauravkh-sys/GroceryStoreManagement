import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PRODUCT_ICON_GROUPS } from '../../data/product-icons';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-inventory-panel',
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './inventory-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPanelComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly categories = this.store.activeCategories;
  readonly categoryGroups = this.store.activeCategoryGroups;
  readonly units = this.store.units;
  readonly editingProductId = signal<string | null>(null);
  readonly formError = signal('');
  readonly lowStockProducts = computed(() =>
    this.store.products().filter(
      (product) => product.stock <= product.lowStockThreshold,
    ),
  );
  readonly iconGroups = PRODUCT_ICON_GROUPS;
  readonly iconSearchControl = new FormControl('', { nonNullable: true });
  private readonly iconSearch = toSignal(this.iconSearchControl.valueChanges, {
    initialValue: this.iconSearchControl.value,
  });
  readonly filteredIconGroups = computed(() => {
    const query = this.iconSearch().trim().toLocaleLowerCase();
    if (!query) {
      return this.iconGroups.map((group) => ({
        ...group,
        displayName: this.language.text(group.name),
        icons: group.icons.map((option) => ({
          ...option,
          displayLabel: this.language.text(option.label),
          searchTerms: this.language
            .text(option.label)
            .toLocaleLowerCase(),
        })),
      }));
    }

    return this.iconGroups
      .map((group) => ({
        ...group,
        displayName: this.language.text(group.name),
        icons: group.icons
          .map((option) => ({
            ...option,
            displayLabel: this.language.text(option.label),
            searchTerms: `${option.label} ${this.language
              .text(option.label)
              .toLocaleLowerCase()}`.toLocaleLowerCase(),
          }))
          .filter((option) => option.searchTerms.includes(query)),
      }))
      .filter((group) => group.icons.length > 0);
  });

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]],
    category: [this.categories()[0] ?? '', Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [1, [Validators.required, Validators.min(0), Validators.max(9999)]],
    lowStockThreshold: [12, [Validators.required, Validators.min(0), Validators.max(9999)]],
    icon: ['🛒', [Validators.required, Validators.maxLength(12)]],
    unit: ['item', [Validators.required, Validators.maxLength(30)]],
  });

  get lowStockCount(): number {
    return this.lowStockProducts().length;
  }

  addProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const product = this.productForm.getRawValue();
    const editingProductId = this.editingProductId();
    const saved = editingProductId
      ? this.store.updateProduct(editingProductId, {
          ...product,
          name: product.name.trim(),
        })
      : this.store.addProduct({ ...product, name: product.name.trim() });
    if (!saved) {
      this.formError.set(
        this.store.isCategoryActive(product.category)
          ? 'Product could not be saved. Check stock against any basket quantities.'
          : 'That category is no longer active. Choose an active category.',
      );
      return;
    }

    this.formError.set('');
    this.editingProductId.set(null);
    this.resetForm();
  }

  editProduct(productId: string): void {
    const product = this.store.products().find((item) => item.id === productId);
    if (!product) {
      this.formError.set('Product could not be found.');
      return;
    }
    this.editingProductId.set(product.id);
    this.formError.set('');
    this.productForm.reset({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      icon: product.icon,
      unit: product.unit,
    });
  }

  cancelEdit(): void {
    this.editingProductId.set(null);
    this.formError.set('');
    this.resetForm();
  }

  private resetForm(): void {
    this.productForm.reset({
      name: '',
      category: this.categories()[0] ?? '',
      price: 0,
      stock: 1,
      lowStockThreshold: 12,
      icon: '🛒',
      unit: 'item',
    });
  }

  selectIcon(icon: string): void {
    this.productForm.controls.icon.setValue(icon);
    this.productForm.controls.icon.markAsDirty();
  }

  deleteProduct(productId: string): void {
    this.store.deleteProduct(productId);
    if (this.editingProductId() === productId) {
      this.cancelEdit();
    }
  }
}
