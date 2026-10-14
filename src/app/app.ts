import { CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InventoryPanelComponent } from './components/inventory-panel/inventory-panel';
import { CategoryMasterComponent } from './components/category-master/category-master';
import { ProductCardComponent } from './components/product-card/product-card';
import {
  LoginScreenComponent,
  type LoginRole,
} from './components/login-screen/login-screen';
import { STORE_WHATSAPP_NUMBER } from './config/store-contact';
import { GroceryStoreService } from './services/grocery-store.service';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';
import { ProductRequestComponent } from './components/product-request/product-request';
import { UnitMasterComponent } from './components/unit-master/unit-master';
import { SalesDashboardComponent } from './components/sales-dashboard/sales-dashboard';
import { OrderManagementComponent } from './components/order-management/order-management';
import { OrderStatus, StoreOrder } from './models/grocery.model';

type StoreView =
  | 'shop'
  | 'inventory'
  | 'categories'
  | 'units'
  | 'dashboard'
  | 'orders';
type AppRole = 'guest' | 'customer' | 'manager';

@Component({
  selector: 'app-root',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    ProductCardComponent,
    InventoryPanelComponent,
    LoginScreenComponent,
    CategoryMasterComponent,
    ProductRequestComponent,
    UnitMasterComponent,
    SalesDashboardComponent,
    OrderManagementComponent,
  ],
  templateUrl: './app.html',
})
export class App {
  readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);
  readonly categories = computed(() => [
    'All',
    ...this.store.activeCategories(),
  ]);
  readonly activeView = signal<StoreView>('shop');
  readonly isLoginScreen = signal(true);
  readonly currentRole = signal<AppRole>('guest');
  readonly currentMobile = signal('');
  readonly selectedCategory = signal('All');
  readonly isCartOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly selectedBill = signal<StoreOrder | null>(null);
  readonly checkoutName = new FormControl('', { nonNullable: true });
  readonly checkoutMobile = new FormControl('', { nonNullable: true });
  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchText = toSignal(this.searchControl.valueChanges, {
    initialValue: this.searchControl.value,
  });
  readonly filteredProducts = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchText().trim().toLocaleLowerCase();
    return this.store.products().filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch =
        product.name.toLocaleLowerCase().includes(query) ||
        this.language.product(product).toLocaleLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  });
  readonly whatsappOrderUrl = computed(() => {
    const items = this.store.cartItems();
    const formatPrice = (amount: number) =>
      new Intl.NumberFormat(this.language.locale(), {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(amount);
    const itemLines = items.map(
      (item) =>
        `- ${this.language.product(item.product)} (${this.language.category(item.product.category)}) x ${item.quantity} ${this.language.unit(item.product.unit)}${item.quantity === 1 ? '' : this.language.current() === 'hi' ? '' : 's'} @ ${formatPrice(item.product.price)} = ${formatPrice(item.lineTotal)}`,
    );
    const message = [
      this.language.text('Hello Durvijay General Store! I would like to place this order:'),
      '',
      ...itemLines,
      '',
      `${this.language.text('Subtotal:')} ${formatPrice(this.store.subtotal())}`,
      `${this.language.text('Tax (8%):')} ${formatPrice(this.store.tax())}`,
      `${this.language.text('Total:')} ${formatPrice(this.store.total())}`,
      '',
      this.language.text('Please confirm availability and delivery or pickup details. Thank you!'),
    ].join('\n');

    return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  });
  readonly inventoryCount = computed(() =>
    this.store.products().reduce((count, product) => count + product.stock, 0),
  );
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const selectedCategory = this.selectedCategory();
      if (
        selectedCategory !== 'All' &&
        !this.store.activeCategories().includes(selectedCategory)
      ) {
        this.selectedCategory.set('All');
      }
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  completeDemoLogin(session: { role: LoginRole; mobile: string }): void {
    this.currentRole.set(session.role);
    this.currentMobile.set(session.mobile);
    this.checkoutMobile.setValue(session.mobile);
    this.activeView.set(session.role === 'manager' ? 'dashboard' : 'shop');
    this.isLoginScreen.set(false);
  }

  placeOrder(): void {
    const name = this.checkoutName.value.trim();
    const mobile = this.checkoutMobile.value.replace(/\D/g, '');
    if (!name || !/^\d{10}$/.test(mobile)) {
      this.checkoutName.markAsTouched();
      this.checkoutMobile.markAsTouched();
      return;
    }
    const result = this.store.createOrder(name, mobile);
    if (!result.success) {
      const message =
        result.reason === 'stock-changed'
          ? 'Some products no longer have enough stock. Review your basket.'
          : 'Unable to place this order. Check the customer details and basket.';
      this.showToast(message);
      return;
    }
    this.currentMobile.set(mobile);
    this.checkoutName.reset('');
    this.isCartOpen.set(false);
    this.selectedBill.set(result.order);
  }

  showBill(order: StoreOrder): void {
    this.selectedBill.set(order);
  }

  printBill(): void {
    this.document.defaultView?.print();
  }

  isCheckoutMobileInvalid(): boolean {
    return (
      this.checkoutMobile.touched &&
      !/^\d{10}$/.test(this.checkoutMobile.value.replace(/\D/g, ''))
    );
  }

  addToCart(productId: string): void {
    const added = this.store.addToCart(productId);
    this.showToast(
      added
        ? this.language.text('Added to your basket')
        : this.language.text('Sorry, this item is out of stock'),
    );
  }

  changeQuantity(productId: string, quantity: number): void {
    if (!this.store.updateCartQuantity(productId, quantity)) {
      this.showToast(this.language.text('That quantity is not available in stock'));
    }
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer !== undefined) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3200);
  }
}
