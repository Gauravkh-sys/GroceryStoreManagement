import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-unit-master',
  imports: [ReactiveFormsModule],
  templateUrl: './unit-master.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitMasterComponent {
  readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly unitControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(24)],
  });
  readonly unitUsage = computed(() =>
    this.store.units().map((unit) => ({
      name: unit,
      products: this.store.products().filter((product) => product.unit === unit)
        .length,
    })),
  );
  message = '';
  errorMessage = '';

  addUnit(): void {
    if (this.unitControl.invalid) {
      this.unitControl.markAsTouched();
      return;
    }
    if (!this.store.addUnit(this.unitControl.value)) {
      this.errorMessage = 'That unit already exists or is not valid.';
      this.message = '';
      return;
    }
    this.unitControl.reset('');
    this.errorMessage = '';
    this.message = 'Unit added.';
  }

  removeUnit(name: string): void {
    if (!this.store.removeUnit(name)) {
      this.errorMessage = 'This unit is a built-in unit or is used by products.';
      this.message = '';
      return;
    }
    this.errorMessage = '';
    this.message = 'Unit removed.';
  }
}
