import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  computed,
  effect,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { INITIAL_PRODUCTS } from '../data/grocery-data';
import {
  CartItem,
  DetailedCartItem,
  GroceryCategory,
  Product,
  CATEGORIES,
  ProductRequest,
  ProductRequestStatus,
  StoreOrder,
  OrderStatus,
} from '../models/grocery.model';

const DEMO_STORAGE_KEY = 'durvijay-store-demo-v1';
const INITIAL_UNITS = ['item', 'kg', 'g', 'litre', 'pack', 'bunch', 'dozen', 'bag', 'bottle'];

interface StoreSnapshot {
  products: Product[];
  categories: GroceryCategory[];
  cart: CartItem[];
  units: string[];
  orders: StoreOrder[];
  requests: ProductRequest[];
}

export type CategoryMutationResult =
  | 'success'
  | 'invalid-name'
  | 'duplicate'
  | 'not-found'
  | 'already-archived'
  | 'already-active';

export type OrderMutationResult =
  | { success: true; order: StoreOrder }
  | { success: false; reason: 'empty-cart' | 'invalid-customer' | 'stock-changed' };

@Injectable({ providedIn: 'root' })
export class GroceryStoreService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly productState = signal<Product[]>(INITIAL_PRODUCTS);
  private readonly cartState = signal<CartItem[]>([]);
  private readonly categoryState = signal<GroceryCategory[]>(
    CATEGORIES.map((name) => ({ name, active: true })),
  );
  private readonly unitState = signal<string[]>(INITIAL_UNITS);
  private readonly orderState = signal<StoreOrder[]>([]);
  private readonly requestState = signal<ProductRequest[]>([]);

  readonly products = this.productState.asReadonly();
  readonly categories = this.categoryState.asReadonly();
  readonly units = this.unitState.asReadonly();
  readonly orders = this.orderState.asReadonly();
  readonly productRequests = this.requestState.asReadonly();
  readonly activeCategories = computed(() =>
    this.categoryState()
      .filter((category) => category.active)
      .map((category) => category.name),
  );
  readonly cartItems = computed<DetailedCartItem[]>(() =>
    this.cartState()
      .map((item) => {
        const product = this.productState().find(
          (candidate) => candidate.id === item.productId,
        );

        return product
          ? {
              ...item,
              product,
              lineTotal: product.price * item.quantity,
            }
          : null;
      })
      .filter((item): item is DetailedCartItem => item !== null),
  );
  readonly cartCount = computed(() =>
    this.cartState().reduce((total, item) => total + item.quantity, 0),
  );
  readonly subtotal = computed(() =>
    this.cartItems().reduce((total, item) => total + item.lineTotal, 0),
  );
  readonly tax = computed(() => this.subtotal() * 0.08);
  readonly total = computed(() => this.subtotal() + this.tax());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const snapshot = this.readSnapshot();
      if (snapshot) {
        this.productState.set(snapshot.products);
        this.categoryState.set(snapshot.categories);
        this.cartState.set(snapshot.cart);
        this.unitState.set(snapshot.units);
        this.orderState.set(snapshot.orders);
        this.requestState.set(snapshot.requests);
      }
      effect(() => this.saveSnapshot());
    }
  }

  createOrder(customerName: string, customerMobile: string): OrderMutationResult {
    const name = customerName.trim();
    const mobile = customerMobile.replace(/\D/g, '');
    const items = this.cartItems();

    if (!name || !/^\d{10}$/.test(mobile)) {
      return { success: false, reason: 'invalid-customer' };
    }
    if (items.length === 0) {
      return { success: false, reason: 'empty-cart' };
    }
    if (
      items.some(
        ({ product, quantity }) =>
          !this.isCategoryActive(product.category) ||
          product.stock < quantity,
      )
    ) {
      return { success: false, reason: 'stock-changed' };
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const order: StoreOrder = {
      id: `DGS-${Date.now().toString(36).toUpperCase()}-${globalThis.crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      customerName: name,
      customerMobile: mobile,
      items: items.map(({ product, quantity, lineTotal }) => ({
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        icon: product.icon,
        unitPrice: product.price,
        quantity,
        lineTotal,
      })),
      subtotal,
      tax: subtotal * 0.08,
      total: subtotal * 1.08,
      status: 'pending',
    };

    this.productState.update((products) =>
      products.map((product) => {
        const ordered = items.find((item) => item.productId === product.id);
        return ordered
          ? { ...product, stock: product.stock - ordered.quantity }
          : product;
      }),
    );
    this.orderState.update((orders) => [order, ...orders]);
    this.cartState.set([]);
    return { success: true, order };
  }

  updateOrderStatus(orderId: string, status: OrderStatus): boolean {
    const order = this.orderState().find((item) => item.id === orderId);
    if (!order || order.status !== 'pending') {
      return false;
    }
    if (status === 'cancelled') {
      this.productState.update((products) =>
        products.map((product) => {
          const line = order.items.find(
            (item) => item.productId === product.id,
          );
          return line ? { ...product, stock: product.stock + line.quantity } : product;
        }),
      );
    }
    this.orderState.update((orders) =>
      orders.map((item) => (item.id === orderId ? { ...item, status } : item)),
    );
    return true;
  }

  createProductRequest(
    request: Omit<ProductRequest, 'id' | 'createdAt' | 'status'>,
  ): boolean {
    const productName = request.productName.trim();
    const customerName = request.customerName.trim();
    const customerMobile = request.customerMobile.replace(/\D/g, '');
    if (
      productName.length < 2 ||
      productName.length > 60 ||
      !customerName ||
      !/^\d{10}$/.test(customerMobile)
    ) {
      return false;
    }

    const newRequest: ProductRequest = {
      ...request,
      id: `REQ-${globalThis.crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      productName,
      customerName,
      customerMobile,
      details: request.details.trim().slice(0, 240),
      status: 'pending',
    };
    this.requestState.update((requests) => [newRequest, ...requests]);
    return true;
  }

  updateProductRequestStatus(
    requestId: string,
    status: ProductRequestStatus,
  ): boolean {
    if (!this.requestState().some((request) => request.id === requestId)) {
      return false;
    }
    this.requestState.update((requests) =>
      requests.map((request) =>
        request.id === requestId ? { ...request, status } : request,
      ),
    );
    return true;
  }

  addUnit(name: string): boolean {
    const normalized = name.trim().toLocaleLowerCase();
    if (
      normalized.length === 0 ||
      normalized.length > 24 ||
      this.unitState().some((unit) => unit.toLocaleLowerCase() === normalized)
    ) {
      return false;
    }
    this.unitState.update((units) => [...units, normalized]);
    return true;
  }

  removeUnit(name: string): boolean {
    if (
      this.productState().some((product) => product.unit === name) ||
      INITIAL_UNITS.includes(name)
    ) {
      return false;
    }
    const previousLength = this.unitState().length;
    this.unitState.update((units) => units.filter((unit) => unit !== name));
    return this.unitState().length !== previousLength;
  }

  isCategoryActive(name: string): boolean {
    return this.categoryState().some(
      (category) => category.name === name && category.active,
    );
  }

  addCategory(name: string): CategoryMutationResult {
    const normalizedName = this.normalizeCategoryName(name);
    if (!normalizedName) {
      return 'invalid-name';
    }
    if (this.hasCategoryName(normalizedName)) {
      return 'duplicate';
    }

    this.categoryState.update((categories) => [
      ...categories,
      { name: normalizedName, active: true },
    ]);
    return 'success';
  }

  renameCategory(
    currentName: string,
    newName: string,
  ): CategoryMutationResult {
    const category = this.categoryState().find(
      (item) => item.name === currentName,
    );
    if (!category) {
      return 'not-found';
    }

    const normalizedName = this.normalizeCategoryName(newName);
    if (!normalizedName) {
      return 'invalid-name';
    }
    if (
      this.categoryState().some(
        (item) =>
          item.name !== currentName &&
          this.namesMatch(item.name, normalizedName),
      )
    ) {
      return 'duplicate';
    }
    if (normalizedName === currentName) {
      return 'success';
    }

    this.categoryState.update((categories) =>
      categories.map((item) =>
        item.name === currentName ? { ...item, name: normalizedName } : item,
      ),
    );
    this.productState.update((products) =>
      products.map((product) =>
        product.category === currentName
          ? { ...product, category: normalizedName }
          : product,
      ),
    );
    return 'success';
  }

  archiveCategory(name: string): CategoryMutationResult {
    const category = this.categoryState().find((item) => item.name === name);
    if (!category) {
      return 'not-found';
    }
    if (!category.active) {
      return 'already-archived';
    }
    this.categoryState.update((categories) =>
      categories.map((item) =>
        item.name === name ? { ...item, active: false } : item,
      ),
    );
    return 'success';
  }

  restoreCategory(name: string): CategoryMutationResult {
    const category = this.categoryState().find((item) => item.name === name);
    if (!category) {
      return 'not-found';
    }
    if (category.active) {
      return 'already-active';
    }

    this.categoryState.update((categories) =>
      categories.map((item) =>
        item.name === name ? { ...item, active: true } : item,
      ),
    );
    return 'success';
  }

  addToCart(productId: string): boolean {
    const product = this.productState().find((item) => item.id === productId);
    if (!product || !this.isCategoryActive(product.category)) {
      return false;
    }

    const existingItem = this.cartState().find(
      (item) => item.productId === productId,
    );
    if (product.stock <= (existingItem?.quantity ?? 0)) {
      return false;
    }

    this.cartState.update((items) =>
      existingItem
        ? items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...items, { productId, quantity: 1 }],
    );
    return true;
  }

  updateCartQuantity(productId: string, quantity: number): boolean {
    const product = this.productState().find((item) => item.id === productId);
    if (!product || !Number.isInteger(quantity) || quantity < 0) {
      return false;
    }

    if (quantity === 0) {
      this.removeFromCart(productId);
      return true;
    }

    if (!this.isCategoryActive(product.category) || quantity > product.stock) {
      return false;
    }

    this.cartState.update((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
    return true;
  }

  removeFromCart(productId: string): void {
    this.cartState.update((items) =>
      items.filter((item) => item.productId !== productId),
    );
  }

  addProduct(product: Omit<Product, 'id'>): boolean {
    if (!this.isCategoryActive(product.category)) {
      return false;
    }

    this.productState.update((products) => [
      {
        ...product,
        id: `product-${globalThis.crypto.randomUUID()}`,
      },
      ...products,
    ]);
    return true;
  }

  deleteProduct(productId: string): void {
    this.productState.update((products) =>
      products.filter((product) => product.id !== productId),
    );
    this.removeFromCart(productId);
  }

  private readSnapshot(): StoreSnapshot | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(
        DEMO_STORAGE_KEY,
      );
      if (!stored) {
        return null;
      }
      const value: unknown = JSON.parse(stored);
      if (!this.isStoreSnapshot(value)) {
        console.warn('Saved demo store data is invalid; using default data.');
        return null;
      }
      return value;
    } catch (error) {
      console.warn('Unable to load saved demo store data.', error);
      return null;
    }
  }

  private saveSnapshot(): void {
    const snapshot: StoreSnapshot = {
      products: this.productState(),
      categories: this.categoryState(),
      cart: this.cartState(),
      units: this.unitState(),
      orders: this.orderState(),
      requests: this.requestState(),
    };
    try {
      this.document.defaultView?.localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
    } catch (error) {
      console.warn('Unable to save demo store data.', error);
    }
  }

  private isStoreSnapshot(value: unknown): value is StoreSnapshot {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const snapshot = value as Partial<StoreSnapshot>;
    return (
      Array.isArray(snapshot.products) &&
      snapshot.products.every(
        (product) =>
          typeof product.id === 'string' &&
          typeof product.name === 'string' &&
          typeof product.category === 'string' &&
          typeof product.price === 'number' &&
          typeof product.stock === 'number' &&
          typeof product.icon === 'string' &&
          typeof product.unit === 'string',
      ) &&
      Array.isArray(snapshot.categories) &&
      snapshot.categories.every(
        (category) =>
          typeof category.name === 'string' &&
          typeof category.active === 'boolean',
      ) &&
      Array.isArray(snapshot.cart) &&
      snapshot.cart.every(
        (item) =>
          typeof item.productId === 'string' &&
          typeof item.quantity === 'number',
      ) &&
      Array.isArray(snapshot.units) &&
      snapshot.units.every((unit) => typeof unit === 'string') &&
      Array.isArray(snapshot.orders) &&
      snapshot.orders.every((order) => this.isStoreOrder(order)) &&
      Array.isArray(snapshot.requests) &&
      snapshot.requests.every((request) => this.isProductRequest(request))
    );
  }

  private isStoreOrder(value: unknown): value is StoreOrder {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const order = value as Partial<StoreOrder>;
    return (
      typeof order.id === 'string' &&
      typeof order.createdAt === 'string' &&
      typeof order.customerName === 'string' &&
      typeof order.customerMobile === 'string' &&
      Array.isArray(order.items) &&
      order.items.every(
        (item) =>
          typeof item.productId === 'string' &&
          typeof item.name === 'string' &&
          typeof item.category === 'string' &&
          typeof item.unit === 'string' &&
          typeof item.icon === 'string' &&
          typeof item.unitPrice === 'number' &&
          typeof item.quantity === 'number' &&
          typeof item.lineTotal === 'number',
      ) &&
      typeof order.subtotal === 'number' &&
      typeof order.tax === 'number' &&
      typeof order.total === 'number' &&
      ['pending', 'completed', 'cancelled'].includes(order.status ?? '')
    );
  }

  private isProductRequest(value: unknown): value is ProductRequest {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const request = value as Partial<ProductRequest>;
    return (
      typeof request.id === 'string' &&
      typeof request.createdAt === 'string' &&
      typeof request.productName === 'string' &&
      typeof request.details === 'string' &&
      typeof request.customerName === 'string' &&
      typeof request.customerMobile === 'string' &&
      ['pending', 'reviewed'].includes(request.status ?? '')
    );
  }

  private normalizeCategoryName(name: string): string | null {
    const normalizedName = name.trim();
    return normalizedName.length > 0 && normalizedName.length <= 40
      ? normalizedName
      : null;
  }

  private hasCategoryName(name: string): boolean {
    return this.categoryState().some((category) =>
      this.namesMatch(category.name, name),
    );
  }

  private namesMatch(left: string, right: string): boolean {
    return left.toLocaleLowerCase() === right.toLocaleLowerCase();
  }
}
