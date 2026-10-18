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
  CATEGORY_DEPARTMENTS,
  DEFAULT_CATEGORIES,
  LEGACY_CATEGORY_NAMES,
} from '../data/category-data';
import {
  CartItem,
  DetailedCartItem,
  GroceryCategory,
  Product,
  ProductRequest,
  ProductRequestStatus,
  StoreOrder,
  OrderStatus,
  FulfillmentMethod,
} from '../models/grocery.model';

const DEMO_STORAGE_KEY = 'durvijay-store-demo-v1';
const INITIAL_UNITS = [
  ...new Set([
    'item',
    'kg',
    'g',
    'litre',
    'pack',
    'bunch',
    'dozen',
    'bag',
    'bottle',
    ...INITIAL_PRODUCTS.map((product) => product.unit),
  ]),
];

interface StoreSnapshot {
  products: Product[];
  categories: GroceryCategory[];
  cart: CartItem[];
  units: string[];
  orders: StoreOrder[];
  requests: ProductRequest[];
  favorites: Record<string, string[]>;
}

export type CategoryMutationResult =
  | 'success'
  | 'invalid-name'
  | 'invalid-department'
  | 'invalid-description'
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
  private readonly productState = signal<Product[]>(
    INITIAL_PRODUCTS.map((product) => ({ ...product, lowStockThreshold: 12 })),
  );
  private readonly cartState = signal<CartItem[]>([]);
  private readonly categoryState = signal<GroceryCategory[]>(DEFAULT_CATEGORIES);
  private readonly unitState = signal<string[]>(INITIAL_UNITS);
  private readonly orderState = signal<StoreOrder[]>([]);
  private readonly requestState = signal<ProductRequest[]>([]);
  private readonly favoriteState = signal<Record<string, string[]>>({});
  readonly persistenceError = signal(false);

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
  readonly activeCategoryGroups = computed(() =>
    CATEGORY_DEPARTMENTS.map((department) => ({
      name: department.name,
      categories: this.categoryState().filter(
        (category) =>
          category.active && category.department === department.name,
      ),
    })).filter((department) => department.categories.length > 0),
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
        this.favoriteState.set(snapshot.favorites);
      }
      effect(() => this.saveSnapshot());
    }
  }

  createOrder(
    customerName: string,
    customerMobile: string,
    fulfillmentMethod: FulfillmentMethod,
    deliveryAddress = '',
  ): OrderMutationResult {
    const name = customerName.trim();
    const mobile = customerMobile.replace(/\D/g, '');
    const items = this.cartItems();

    if (
      !name ||
      !/^\d{10}$/.test(mobile) ||
      !['pickup', 'delivery'].includes(fulfillmentMethod) ||
      (fulfillmentMethod === 'delivery' &&
        (!deliveryAddress.trim() || deliveryAddress.trim().length > 160))
    ) {
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
      fulfillmentMethod,
      deliveryAddress: fulfillmentMethod === 'delivery' ? deliveryAddress.trim() : '',
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
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!order || !allowedTransitions[order.status].includes(status)) {
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

  addCategory(
    name: string,
    department: string,
    description = '',
  ): CategoryMutationResult {
    const normalizedName = this.normalizeCategoryName(name);
    if (!normalizedName) {
      return 'invalid-name';
    }
    if (!CATEGORY_DEPARTMENTS.some((item) => item.name === department)) {
      return 'invalid-department';
    }
    const normalizedDescription = description.trim();
    if (normalizedDescription.length > 160) {
      return 'invalid-description';
    }
    if (this.hasCategoryName(normalizedName)) {
      return 'duplicate';
    }

    this.categoryState.update((categories) => [
      ...categories,
      {
        name: normalizedName,
        department,
        description: normalizedDescription,
        active: true,
      },
    ]);
    return 'success';
  }

  categoryDepartment(name: string): string {
    return (
      this.categoryState().find((category) => category.name === name)
        ?.department ?? ''
    );
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
    const cartItem = this.cartState().find(
      (item) => item.productId === productId,
    );
    if (!product || !cartItem || !Number.isInteger(quantity) || quantity < 0) {
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
    const name = product.name.trim();
    if (
      name.length === 0 ||
      name.length > 60 ||
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      !Number.isInteger(product.stock) ||
      product.stock < 0 ||
      product.stock > 9999 ||
      !Number.isInteger(product.lowStockThreshold) ||
      product.lowStockThreshold < 0 ||
      product.lowStockThreshold > 9999 ||
      !this.isCategoryActive(product.category) ||
      !this.unitState().includes(product.unit)
    ) {
      return false;
    }

    this.productState.update((products) => [
      {
        ...product,
        name,
        id: `product-${globalThis.crypto.randomUUID()}`,
      },
      ...products,
    ]);
    return true;
  }

  updateProduct(productId: string, product: Omit<Product, 'id'>): boolean {
    const existing = this.productState().find((item) => item.id === productId);
    const cartQuantity =
      this.cartState().find((item) => item.productId === productId)?.quantity ?? 0;
    const name = product.name.trim();
    if (
      !existing ||
      name.length === 0 ||
      name.length > 60 ||
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      !Number.isInteger(product.stock) ||
      product.stock < cartQuantity ||
      product.stock > 9999 ||
      !Number.isInteger(product.lowStockThreshold) ||
      product.lowStockThreshold < 0 ||
      product.lowStockThreshold > 9999 ||
      !this.isCategoryActive(product.category) ||
      !this.unitState().includes(product.unit)
    ) {
      return false;
    }
    this.productState.update((products) =>
      products.map((item) =>
        item.id === productId ? { ...product, name, id: productId } : item,
      ),
    );
    return true;
  }

  favoriteIds(customerMobile: string): ReadonlySet<string> {
    const mobile = customerMobile.replace(/\D/g, '');
    return new Set(this.favoriteState()[mobile] ?? []);
  }

  toggleFavorite(productId: string, customerMobile: string): boolean {
    const mobile = customerMobile.replace(/\D/g, '');
    if (
      !/^\d{10}$/.test(mobile) ||
      !this.productState().some((item) => item.id === productId)
    ) {
      return false;
    }
    this.favoriteState.update((favorites) => {
      const customerFavorites = new Set(favorites[mobile] ?? []);
      if (customerFavorites.has(productId)) {
        customerFavorites.delete(productId);
      } else {
        customerFavorites.add(productId);
      }
      return { ...favorites, [mobile]: [...customerFavorites] };
    });
    return true;
  }

  reorderOrder(orderId: string): boolean {
    const order = this.orderState().find((item) => item.id === orderId);
    if (!order || order.items.length === 0) {
      return false;
    }
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const additions = [...quantities].map(([productId, quantity]) => ({
      product: this.productState().find((item) => item.id === productId),
      quantity,
    }));
    if (
      additions.some(
        ({ product, quantity }) =>
          !product ||
          !this.isCategoryActive(product.category) ||
          product.stock <
            quantity +
              (this.cartState().find((item) => item.productId === product.id)
                ?.quantity ?? 0),
      )
    ) {
      return false;
    }
    this.cartState.update((cart) => {
      const next = new Map(cart.map((item) => [item.productId, item.quantity]));
      for (const { product, quantity } of additions) {
        if (product) {
          next.set(product.id, (next.get(product.id) ?? 0) + quantity);
        }
      }
      return [...next].map(([productId, quantity]) => ({ productId, quantity }));
    });
    return true;
  }

  deleteProduct(productId: string): void {
    this.productState.update((products) =>
      products.filter((product) => product.id !== productId),
    );
    this.removeFromCart(productId);
    this.favoriteState.update((favorites) =>
      Object.fromEntries(
        Object.entries(favorites).map(([mobile, ids]) => [
          mobile,
          ids.filter((id) => id !== productId),
        ]),
      ),
    );
  }

  private readSnapshot(): StoreSnapshot | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(
        DEMO_STORAGE_KEY,
      );
      if (!stored) {
        return null;
      }
      const value = this.migrateSnapshot(JSON.parse(stored) as unknown);
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
      favorites: this.favoriteState(),
    };
    try {
      this.document.defaultView?.localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
      this.persistenceError.set(false);
    } catch (error) {
      console.warn('Unable to save demo store data.', error);
      this.persistenceError.set(true);
    }
  }

  private isStoreSnapshot(value: unknown): value is StoreSnapshot {
    if (!this.isRecord(value)) {
      return false;
    }
    const snapshot = value as Partial<StoreSnapshot>;
    const productIds = new Set<string>();
    const cartProductIds = new Set<string>();
    const categoryNames = new Set<string>();
    const unitNames = new Set<string>();

    if (
      !Array.isArray(snapshot.categories) ||
      !snapshot.categories.every((category) => {
        if (
          !this.isRecord(category) ||
          typeof category.name !== 'string' ||
          category.name.trim().length === 0 ||
          category.name.length > 40 ||
          typeof category.department !== 'string' ||
          !CATEGORY_DEPARTMENTS.some(
            (department) => department.name === category.department,
          ) ||
          typeof category.description !== 'string' ||
          category.description.length > 160 ||
          typeof category.active !== 'boolean'
        ) {
          return false;
        }
        const normalizedName = category.name.toLocaleLowerCase();
        if (categoryNames.has(normalizedName)) {
          return false;
        }
        categoryNames.add(normalizedName);
        return true;
      }) ||
      !Array.isArray(snapshot.units) ||
      !snapshot.units.every((unit) => {
        if (typeof unit !== 'string' || unit.trim().length === 0 || unit.length > 24) {
          return false;
        }
        const normalizedUnit = unit.toLocaleLowerCase();
        if (unitNames.has(normalizedUnit)) {
          return false;
        }
        unitNames.add(normalizedUnit);
        return true;
      })
    ) {
      return false;
    }

    return (
      Array.isArray(snapshot.products) &&
      snapshot.products.every(
        (product) => {
          if (
            !this.isRecord(product) ||
            typeof product.id !== 'string' ||
            product.id.length === 0 ||
            productIds.has(product.id) ||
            typeof product.name !== 'string' ||
            product.name.trim().length === 0 ||
            product.name.length > 60 ||
            typeof product.category !== 'string' ||
            !categoryNames.has(product.category.toLocaleLowerCase()) ||
            !this.isFiniteNumber(product.price) ||
            product.price <= 0 ||
            !Number.isInteger(product.stock) ||
            product.stock < 0 ||
            product.stock > 9999 ||
            !Number.isInteger(product.lowStockThreshold) ||
            product.lowStockThreshold < 0 ||
            product.lowStockThreshold > 9999 ||
            typeof product.icon !== 'string' ||
            product.icon.length === 0 ||
            product.icon.length > 12 ||
            typeof product.unit !== 'string' ||
            !unitNames.has(product.unit.toLocaleLowerCase())
          ) {
            return false;
          }
          productIds.add(product.id);
          return true;
        },
      ) &&
      Array.isArray(snapshot.cart) &&
      snapshot.cart.every(
        (item) => {
          if (
            !this.isRecord(item) ||
            typeof item.productId !== 'string' ||
            !productIds.has(item.productId) ||
            cartProductIds.has(item.productId) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
          ) {
            return false;
          }
          cartProductIds.add(item.productId);
          const product = snapshot.products?.find(
            (candidate) => candidate.id === item.productId,
          );
          return product !== undefined && item.quantity <= product.stock;
        },
      ) &&
      Array.isArray(snapshot.orders) &&
      snapshot.orders.every((order) => this.isStoreOrder(order)) &&
      Array.isArray(snapshot.requests) &&
      snapshot.requests.every((request) => this.isProductRequest(request)) &&
      this.isRecord(snapshot.favorites) &&
      Object.entries(snapshot.favorites).every(
        ([mobile, ids]) =>
          /^\d{10}$/.test(mobile) &&
          Array.isArray(ids) &&
          ids.every((id) => typeof id === 'string' && productIds.has(id)),
      )
    );
  }

  private isStoreOrder(value: unknown): value is StoreOrder {
    if (!this.isRecord(value)) {
      return false;
    }
    const order = value as Partial<StoreOrder>;
    const orderProductIds = new Set<string>();
    return (
      typeof order.id === 'string' &&
      order.id.length > 0 &&
      this.isValidDate(order.createdAt) &&
      typeof order.customerName === 'string' &&
      order.customerName.trim().length > 0 &&
      /^\d{10}$/.test(order.customerMobile ?? '') &&
      Array.isArray(order.items) &&
      order.items.length > 0 &&
      order.items.every((item) => {
        if (!this.isRecord(item)) {
          return false;
        }
        if (
          typeof item.productId !== 'string' ||
          item.productId.length === 0 ||
          orderProductIds.has(item.productId) ||
          typeof item.name !== 'string' ||
          item.name.trim().length === 0 ||
          typeof item.category !== 'string' ||
          typeof item.unit !== 'string' ||
          typeof item.icon !== 'string' ||
          !this.isFiniteNumber(item.unitPrice) ||
          item.unitPrice <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          !this.isFiniteNumber(item.lineTotal) ||
          Math.abs(item.lineTotal - item.unitPrice * item.quantity) >= 0.005
        ) {
          return false;
        }
        orderProductIds.add(item.productId);
        return true;
      }) &&
      this.isFiniteNumber(order.subtotal) &&
      order.subtotal > 0 &&
      this.isFiniteNumber(order.tax) &&
      Math.abs(order.tax - order.subtotal * 0.08) < 0.005 &&
      this.isFiniteNumber(order.total) &&
      Math.abs(order.total - order.subtotal - order.tax) < 0.005 &&
      Math.abs(
        order.subtotal -
          order.items.reduce((sum, item) => sum + item.lineTotal, 0),
      ) < 0.005 &&
      ['pending', 'preparing', 'ready', 'completed', 'cancelled'].includes(order.status ?? '') &&
      ['pickup', 'delivery'].includes(order.fulfillmentMethod ?? '') &&
      typeof order.deliveryAddress === 'string' &&
      order.deliveryAddress.length <= 160 &&
      (order.fulfillmentMethod !== 'delivery' || order.deliveryAddress.trim().length > 0)
    );
  }

  private isProductRequest(value: unknown): value is ProductRequest {
    if (!this.isRecord(value)) {
      return false;
    }
    const request = value as Partial<ProductRequest>;
    return (
      typeof request.id === 'string' &&
      request.id.length > 0 &&
      this.isValidDate(request.createdAt) &&
      typeof request.productName === 'string' &&
      request.productName.trim().length >= 2 &&
      request.productName.length <= 60 &&
      typeof request.details === 'string' &&
      request.details.length <= 240 &&
      typeof request.customerName === 'string' &&
      request.customerName.trim().length > 0 &&
      /^\d{10}$/.test(request.customerMobile ?? '') &&
      ['pending', 'reviewed'].includes(request.status ?? '')
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private migrateSnapshot(value: unknown): unknown {
    if (!this.isRecord(value) || !Array.isArray(value['categories'])) {
      return value;
    }

    const categories = new Map<string, GroceryCategory>();
    const categoryNames = new Map<string, string>();

    for (const savedCategory of value['categories']) {
      if (!this.isRecord(savedCategory) || typeof savedCategory['name'] !== 'string') {
        continue;
      }
      const oldName = savedCategory['name'];
      const name = LEGACY_CATEGORY_NAMES[oldName] ?? oldName;
      categoryNames.set(oldName, name);
      const defaultCategory = DEFAULT_CATEGORIES.find(
        (category) => category.name === name,
      );
      const department =
        typeof savedCategory['department'] === 'string' &&
        CATEGORY_DEPARTMENTS.some(
          (item) => item.name === savedCategory['department'],
        )
          ? savedCategory['department']
          : defaultCategory?.department ?? 'Other Essentials';
      categories.set(name, {
        name,
        department,
        description:
          typeof savedCategory['description'] === 'string'
            ? savedCategory['description'].slice(0, 160)
            : defaultCategory?.description ?? '',
        active:
          typeof savedCategory['active'] === 'boolean'
            ? savedCategory['active']
            : true,
      });
    }

    for (const category of DEFAULT_CATEGORIES) {
      if (!categories.has(category.name)) {
        categories.set(category.name, category);
      }
    }

    const renamedCategory = (category: unknown): unknown =>
      typeof category === 'string'
        ? categoryNames.get(category) ??
          LEGACY_CATEGORY_NAMES[category] ??
          category
        : category;
    const migrateProductCategory = (category: unknown): unknown => {
      const name = renamedCategory(category);
      if (typeof name !== 'string') {
        return name;
      }
      if (!categories.has(name)) {
        categories.set(name, {
          name,
          department: 'Other Essentials',
          description: '',
          active: true,
        });
      }
      return name;
    };

    const products = Array.isArray(value['products'])
      ? value['products'].map((product) =>
          this.isRecord(product)
            ? {
                ...product,
                lowStockThreshold:
                  Number.isInteger(product['lowStockThreshold']) &&
                  (product['lowStockThreshold'] as number) >= 0 &&
                  (product['lowStockThreshold'] as number) <= 9999
                    ? product['lowStockThreshold']
                    : 12,
                category: migrateProductCategory(product['category']),
              }
            : product,
        )
      : value['products'];
    const units = Array.isArray(value['units']) ? [...value['units']] : [];
    const knownUnits = new Set(
      units
        .filter((unit): unit is string => typeof unit === 'string')
        .map((unit) => unit.toLocaleLowerCase()),
    );
    if (Array.isArray(products)) {
      for (const product of products) {
        if (
          this.isRecord(product) &&
          typeof product['unit'] === 'string' &&
          !knownUnits.has(product['unit'].toLocaleLowerCase())
        ) {
          units.push(product['unit']);
          knownUnits.add(product['unit'].toLocaleLowerCase());
        }
      }
    }
    const orders = Array.isArray(value['orders'])
      ? value['orders'].map((order) =>
          this.isRecord(order) && Array.isArray(order['items'])
            ? {
                ...order,
                fulfillmentMethod:
                  order['fulfillmentMethod'] === 'delivery' ? 'delivery' : 'pickup',
                deliveryAddress:
                  typeof order['deliveryAddress'] === 'string'
                    ? order['deliveryAddress'].slice(0, 160)
                    : '',
                items: order['items'].map((item) =>
                  this.isRecord(item)
                    ? {
                        ...item,
                        category: renamedCategory(item['category']),
                      }
                    : item,
                ),
              }
            : order,
        )
      : value['orders'];

    return {
      ...value,
      categories: [...categories.values()],
      products,
      units,
      orders,
      favorites:
        this.isRecord(value['favorites'])
          ? Object.fromEntries(
              Object.entries(value['favorites']).filter(
                ([mobile, ids]) =>
                  /^\d{10}$/.test(mobile) &&
                  Array.isArray(ids) &&
                  ids.every(
                    (id) =>
                      typeof id === 'string' &&
                      Array.isArray(products) &&
                      products.some(
                        (product) =>
                          this.isRecord(product) && product['id'] === id,
                      ),
                  ),
              ),
            )
          : {},
    };
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private isValidDate(value: unknown): value is string {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
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
