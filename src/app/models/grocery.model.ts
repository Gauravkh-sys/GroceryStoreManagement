export const CATEGORIES = [
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Bakery & Snacks',
  'Beverages',
  'Household Essentials',
] as const;

export type ProductCategory = string;

export interface GroceryCategory {
  name: ProductCategory;
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
