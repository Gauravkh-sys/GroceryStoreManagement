import { computed, Injectable, signal } from '@angular/core';
import { INITIAL_PRODUCTS } from '../data/grocery-data';
import {
  CartItem,
  DetailedCartItem,
  Product,
} from '../models/grocery.model';

@Injectable({ providedIn: 'root' })
export class GroceryStoreService {
  private readonly productState = signal<Product[]>(INITIAL_PRODUCTS);
  private readonly cartState = signal<CartItem[]>([]);

  readonly products = this.productState.asReadonly();
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

  addToCart(productId: string): boolean {
    const product = this.productState().find((item) => item.id === productId);
    if (!product) {
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

    if (quantity > product.stock) {
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

  checkout(): boolean {
    const items = this.cartState();
    if (items.length === 0) {
      return false;
    }

    const products = this.productState();
    const canFulfill = items.every((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      return product !== undefined && product.stock >= item.quantity;
    });
    if (!canFulfill) {
      return false;
    }

    const purchasedQuantities = new Map(
      items.map((item) => [item.productId, item.quantity]),
    );
    this.productState.set(
      products.map((product) => ({
        ...product,
        stock: product.stock - (purchasedQuantities.get(product.id) ?? 0),
      })),
    );
    this.cartState.set([]);
    return true;
  }

  addProduct(product: Omit<Product, 'id'>): void {
    this.productState.update((products) => [
      {
        ...product,
        id: `product-${globalThis.crypto.randomUUID()}`,
      },
      ...products,
    ]);
  }

  deleteProduct(productId: string): void {
    this.productState.update((products) =>
      products.filter((product) => product.id !== productId),
    );
    this.removeFromCart(productId);
  }
}
