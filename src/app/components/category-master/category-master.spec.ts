import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { CategoryMasterComponent } from './category-master';

describe('CategoryMasterComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [CategoryMasterComponent] });
  });

  it('creates a category and reports duplicate names', () => {
    const fixture = TestBed.createComponent(CategoryMasterComponent);
    const store = TestBed.inject(GroceryStoreService);
    fixture.componentInstance.addForm.setValue({
      name: 'Frozen Foods',
      department: 'Grocery & Kitchen',
      description: 'Frozen products',
    });

    fixture.componentInstance.addCategory();

    expect(store.categories().some((category) => category.name === 'Frozen Foods')).toBe(true);
    expect(fixture.componentInstance.statusMessage()).toBe('Category added.');

    fixture.componentInstance.addForm.controls.name.setValue('Frozen Foods');
    fixture.componentInstance.addCategory();
    expect(fixture.componentInstance.formError()).toBe('A category with that name already exists.');
  });

  it('renames, archives, and restores a category', () => {
    const fixture = TestBed.createComponent(CategoryMasterComponent);
    const store = TestBed.inject(GroceryStoreService);
    fixture.componentInstance.beginRename('Vegetables & Fruits');
    fixture.componentInstance.renameForm.controls.name.setValue('Produce');
    fixture.componentInstance.saveRename('Vegetables & Fruits');
    expect(store.activeCategories()).toContain('Produce');

    fixture.componentInstance.archiveCategory('Produce');
    expect(store.activeCategories()).not.toContain('Produce');
    fixture.componentInstance.restoreCategory('Produce');
    expect(store.activeCategories()).toContain('Produce');
  });
});
