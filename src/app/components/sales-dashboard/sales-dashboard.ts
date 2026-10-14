import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-sales-dashboard',
  imports: [CurrencyPipe],
  templateUrl: './sales-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesDashboardComponent {
  readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly completedOrders = computed(() =>
    this.store.orders().filter((order) => order.status === 'completed'),
  );
  readonly pendingOrders = computed(() =>
    this.store.orders().filter((order) => order.status === 'pending').length,
  );
  readonly completedRevenue = computed(() =>
    this.completedOrders().reduce((sum, order) => sum + order.total, 0),
  );
  readonly todayOrders = computed(() => {
    const today = new Date().toLocaleDateString();
    return this.store.orders().filter(
      (order) => new Date(order.createdAt).toLocaleDateString() === today,
    );
  });
  readonly todayRevenue = computed(() =>
    this.todayOrders()
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0),
  );
  readonly topProducts = computed(() => {
    const totals = new Map<string, { name: string; quantity: number }>();
    for (const order of this.completedOrders()) {
      for (const item of order.items) {
        const current = totals.get(item.productId) ?? {
          name: item.name,
          quantity: 0,
        };
        totals.set(item.productId, {
          ...current,
          quantity: current.quantity + item.quantity,
        });
      }
    }
    return [...totals.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5);
  });
}
