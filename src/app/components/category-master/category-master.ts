import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CategoryMutationResult,
  GroceryStoreService,
} from '../../services/grocery-store.service';

@Component({
  selector: 'app-category-master',
  imports: [ReactiveFormsModule],
  templateUrl: './category-master.html',
})
export class CategoryMasterComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly store = inject(GroceryStoreService);
  readonly activeCategories = computed(() =>
    this.store.categories().filter((category) => category.active),
  );
  readonly archivedCategories = computed(() =>
    this.store.categories().filter((category) => !category.active),
  );
  readonly editingCategory = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly addForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
  });
  readonly renameForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
  });

  productCount(categoryName: string): number {
    return this.store
      .products()
      .filter((product) => product.category === categoryName).length;
  }

  addCategory(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const result = this.store.addCategory(this.addForm.controls.name.value);
    if (result !== 'success') {
      this.showError(result);
      return;
    }

    this.addForm.reset({ name: '' });
    this.formError.set(null);
    this.statusMessage.set('Category added.');
  }

  beginRename(categoryName: string): void {
    this.editingCategory.set(categoryName);
    this.renameForm.setValue({ name: categoryName });
    this.formError.set(null);
    this.statusMessage.set(null);
  }

  cancelRename(): void {
    this.editingCategory.set(null);
    this.formError.set(null);
  }

  saveRename(categoryName: string): void {
    if (this.renameForm.invalid) {
      this.renameForm.markAllAsTouched();
      return;
    }

    const result = this.store.renameCategory(
      categoryName,
      this.renameForm.controls.name.value,
    );
    if (result !== 'success') {
      this.showError(result);
      return;
    }

    this.editingCategory.set(null);
    this.formError.set(null);
    this.statusMessage.set('Category renamed.');
  }

  archiveCategory(categoryName: string): void {
    const result = this.store.archiveCategory(categoryName);
    if (result !== 'success') {
      this.showError(result);
      return;
    }

    this.formError.set(null);
    this.statusMessage.set('Category archived. Existing products remain visible but cannot be added to the basket.');
  }

  restoreCategory(categoryName: string): void {
    const result = this.store.restoreCategory(categoryName);
    if (result !== 'success') {
      this.showError(result);
      return;
    }

    this.formError.set(null);
    this.statusMessage.set('Category restored.');
  }

  private showError(result: Exclude<CategoryMutationResult, 'success'>): void {
    const messages: Record<Exclude<CategoryMutationResult, 'success'>, string> =
      {
        'invalid-name': 'Enter a category name with 1 to 40 characters.',
        duplicate: 'A category with that name already exists.',
        'not-found': 'That category no longer exists. Refresh and try again.',
        'already-archived': 'That category is already archived.',
        'already-active': 'That category is already active.',
      };

    this.formError.set(messages[result]);
    this.statusMessage.set(null);
  }
}
