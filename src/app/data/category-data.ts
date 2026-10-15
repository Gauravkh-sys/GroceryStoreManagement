import type { GroceryCategory } from '../models/grocery.model';

export interface CategoryDefinition {
  name: string;
  description: string;
}

export interface CategoryDepartment {
  name: string;
  categories: readonly CategoryDefinition[];
}

export const CATEGORY_DEPARTMENTS = [
  {
    name: 'Grocery & Kitchen',
    categories: [
      { name: 'Vegetables & Fruits', description: 'Fresh seasonal produce, daily greens, and root vegetables' },
      { name: 'Atta, Rice & Dal', description: 'Wheat flour, grains, lentils, and pulses' },
      { name: 'Oil, Ghee & Masala', description: 'Cooking oils, desi ghee, spices, and seasonings' },
      { name: 'Dairy, Bread & Eggs', description: 'Milk, curd, paneer, butter, cheese, bread, and eggs' },
      { name: 'Bakery & Biscuits', description: 'Sliced bread, rusks, cookies, and baked snacks' },
      { name: 'Dry Fruits & Cereals', description: 'Nuts, raisins, breakfast cereals, and oats' },
    ],
  },
  {
    name: 'Snacks & Drinks',
    categories: [
      { name: 'Chips & Namkeen', description: 'Potato chips, bhujia, crisps, and traditional snacks' },
      { name: 'Sweets & Chocolates', description: 'Chocolates, candies, traditional mithai, and desserts' },
      { name: 'Drinks & Juices', description: 'Cold drinks, sodas, packaged juices, and coconut water' },
      { name: 'Tea, Coffee & Milk Drinks', description: 'Tea leaves, instant coffee, and health beverage mixes' },
      { name: 'Instant Food', description: 'Noodles, pasta, soup mixes, and ready-to-eat meals' },
      { name: 'Sauces & Spreads', description: 'Ketchup, jams, peanut butter, and dips' },
      { name: 'Paan Corner', description: 'Mouth fresheners, rolling papers, and related items' },
      { name: 'Ice Creams & More', description: 'Ice cream tubs, sticks, and frozen desserts' },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    categories: [
      { name: 'Bath & Body', description: 'Soaps, shower gels, body lotions, and talc' },
      { name: 'Hair', description: 'Shampoos, conditioners, hair oils, and styling products' },
      { name: 'Skin & Face', description: 'Face wash, moisturizers, serums, and sunscreens' },
      { name: 'Beauty & Cosmetics', description: 'Makeup, kajal, lipsticks, and beauty accessories' },
      { name: 'Feminine Hygiene', description: 'Sanitary pads, liners, and personal hygiene goods' },
      { name: 'Baby Care', description: 'Diapers, baby wipes, baby food, and skin care' },
      { name: 'Health & Pharma', description: 'OTC medicines, antacids, band-aids, and supplements' },
      { name: 'Sexual Wellness', description: 'Condoms, lubricants, and wellness essentials' },
    ],
  },
  {
    name: 'Other Essentials',
    categories: [
      { name: 'Home & Lifestyle', description: 'Cleaners, detergents, insect repellents, and air fresheners' },
      { name: 'Electronics', description: 'Mobile accessories, chargers, earphones, and batteries' },
      { name: 'Stationery & Games', description: 'Notebooks, pens, toys, and indoor games' },
      { name: 'Pet Care', description: 'Pet food, treats, and grooming supplies' },
    ],
  },
] as const satisfies readonly CategoryDepartment[];

export const DEFAULT_CATEGORIES: GroceryCategory[] =
  CATEGORY_DEPARTMENTS.flatMap((department) =>
    department.categories.map((category) => ({
      ...category,
      department: department.name,
      active: true,
    })),
  );

export const LEGACY_CATEGORY_NAMES: Readonly<Record<string, string>> = {
  'Fruits & Vegetables': 'Vegetables & Fruits',
  'Dairy & Eggs': 'Dairy, Bread & Eggs',
  'Bakery & Snacks': 'Bakery & Biscuits',
  Beverages: 'Drinks & Juices',
  'Household Essentials': 'Home & Lifestyle',
};
