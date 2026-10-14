import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Product } from '../../models/grocery.model';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  templateUrl: './product-card.html',
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly add = output<string>();
}
