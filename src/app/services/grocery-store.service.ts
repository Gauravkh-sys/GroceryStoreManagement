import { computed, Injectable, signal } from '@angular/core';
import { INITIAL_PRODUCTS } from '../data/grocery-data';
import {
  CartItem,
  DetailedCartItem,
  GroceryCategory,
  Product,
  CATEGORIES,
} from '../models/grocery.model';

export type CategoryMutationResult =
  | 'success'
  | 'invalid-name'
  | 'duplicate'
  | 'not-found'
  | 'already-archived'
  | 'already-active';

@Injectable({ providedIn: 'root' })
export class GroceryStoreService {
  private readonly productState = signal<Product[]>(INITIAL_PRODUCTS);
  private readonly cartState = signal<CartItem[]>([]);
  private readonly categoryState = signal<GroceryCategory[]>(
    CATEGORIES.map((name) => ({ name, active: true })),
  );

  readonly products = this.productState.asReadonly();
  readonly categories = this.categoryState.asReadonly();
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
