export type ProductCategory = string;

export interface GroceryCategory {
  name: ProductCategory;
  department: string;
  description: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  icon: string;
  unit: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface DetailedCartItem extends CartItem {
  product: Product;
  lineTotal: number;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface OrderLine {
  productId: string;
  name: string;
  category: ProductCategory;
  unit: string;
  icon: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface StoreOrder {
  id: string;
  createdAt: string;
  customerName: string;
  customerMobile: string;
  items: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
}

export type ProductRequestStatus = 'pending' | 'reviewed';

export interface ProductRequest {
  id: string;
  createdAt: string;
  productName: string;
  details: string;
  customerName: string;
  customerMobile: string;
  status: ProductRequestStatus;
}
