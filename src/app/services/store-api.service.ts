import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CartItem,
  GroceryCategory,
  OrderStatus,
  Product,
  ProductRequest,
  ProductRequestStatus,
  StoreOrder,
} from '../models/grocery.model';

/** Error body returned by every `/api/*` endpoint on failure. */
export interface StoreApiError {
  error: string;
  message: string;
}

/** Reads the machine-readable error code (e.g. `duplicate`, `stock-changed`) from a failed request. */
export function storeApiErrorCode(response: unknown): string | null {
  if (response instanceof HttpErrorResponse) {
    const body = response.error as Partial<StoreApiError> | null;
    return typeof body?.error === 'string' ? body.error : null;
  }
  return null;
}

/**
 * Thin typed client for the Netlify Functions backed by Netlify Database.
 * Each method maps 1:1 to an endpoint; see docs/DATABASE.md for integration steps.
 */
@Injectable({ providedIn: 'root' })
export class StoreApiService {
  private readonly http = inject(HttpClient);

  // Products
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products');
  }

  addProduct(product: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<Product>('/api/products', product);
  }

  updateProduct(
    productId: string,
    changes: Partial<Pick<Product, 'price' | 'stock'>>,
  ): Observable<Product> {
    return this.http.patch<Product>(`/api/products/${encodeURIComponent(productId)}`, changes);
  }

  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<void>(`/api/products/${encodeURIComponent(productId)}`);
  }

  // Categories
  getCategories(): Observable<GroceryCategory[]> {
    return this.http.get<GroceryCategory[]>('/api/categories');
  }

  addCategory(name: string): Observable<GroceryCategory> {
    return this.http.post<GroceryCategory>('/api/categories', { name });
  }

  updateCategory(
    currentName: string,
    changes: Partial<GroceryCategory>,
  ): Observable<GroceryCategory> {
    return this.http.patch<GroceryCategory>(
      `/api/categories/${encodeURIComponent(currentName)}`,
      changes,
    );
  }

  // Units
  getUnits(): Observable<string[]> {
    return this.http.get<string[]>('/api/units');
  }

  addUnit(name: string): Observable<string> {
    return this.http.post<string>('/api/units', { name });
  }

  removeUnit(name: string): Observable<void> {
    return this.http.delete<void>(`/api/units/${encodeURIComponent(name)}`);
  }

  // Orders
  getOrders(customerMobile?: string): Observable<StoreOrder[]> {
    return this.http.get<StoreOrder[]>('/api/orders', {
      params: customerMobile ? { mobile: customerMobile } : {},
    });
  }

  createOrder(
    customerName: string,
    customerMobile: string,
    items: CartItem[],
  ): Observable<StoreOrder> {
    return this.http.post<StoreOrder>('/api/orders', { customerName, customerMobile, items });
  }

  updateOrderStatus(
    orderId: string,
    status: Exclude<OrderStatus, 'pending'>,
  ): Observable<StoreOrder> {
    return this.http.patch<StoreOrder>(`/api/orders/${encodeURIComponent(orderId)}`, { status });
  }

  // Product requests
  getProductRequests(): Observable<ProductRequest[]> {
    return this.http.get<ProductRequest[]>('/api/product-requests');
  }

  createProductRequest(
    request: Omit<ProductRequest, 'id' | 'createdAt' | 'status'>,
  ): Observable<ProductRequest> {
    return this.http.post<ProductRequest>('/api/product-requests', request);
  }

  updateProductRequestStatus(
    requestId: string,
    status: ProductRequestStatus,
  ): Observable<ProductRequest> {
    return this.http.patch<ProductRequest>(
      `/api/product-requests/${encodeURIComponent(requestId)}`,
      { status },
    );
  }
}
