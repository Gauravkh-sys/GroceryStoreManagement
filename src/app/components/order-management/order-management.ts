import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ProductRequest, StoreOrder } from '../../models/grocery.model';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-order-management',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './order-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderManagementComponent {
  readonly manager = input(false);
  readonly customerMobile = input('');
  readonly billRequested = output<StoreOrder>();
  readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly actionError = signal('');
  readonly visibleOrders = computed(() =>
    this.manager()
      ? this.store.orders()
      : this.store
          .orders()
          .filter(
            (order) =>
              order.customerMobile === this.customerMobile() &&
              this.customerMobile().length > 0,
          ),
  );
  readonly requests = computed(() => this.store.productRequests());

  printBill(order: StoreOrder): void {
    this.billRequested.emit(order);
  }

  updateOrder(order: StoreOrder, status: 'completed' | 'cancelled'): void {
    if (!this.store.updateOrderStatus(order.id, status)) {
      this.actionError.set('This order status could not be updated.');
      return;
    }
    this.actionError.set('');
  }

  updateRequest(request: ProductRequest): void {
    const updated = this.store.updateProductRequestStatus(
      request.id,
      request.status === 'pending' ? 'reviewed' : 'pending',
    );
    this.actionError.set(
      updated ? '' : 'This product request could not be updated.',
    );
  }
}
