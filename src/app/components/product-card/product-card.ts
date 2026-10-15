import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Product } from '../../models/grocery.model';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  templateUrl: './product-card.html',
})
export class ProductCardComponent {
  private readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly product = input.required<Product>();
  readonly add = output<string>();
  readonly categoryDepartment = computed(() =>
    this.store.categoryDepartment(this.product().category),
  );
  readonly categoryIsActive = computed(() =>
    this.store.isCategoryActive(this.product().category),
  );
}
