import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Money is stored as numeric(10,2) and returned by the driver as a string;
// the API layer converts it back to a number for the UI.
const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  department: text().notNull().default('Other Essentials'),
  description: text().notNull().default(''),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const units = pgTable('units', {
  name: text().primaryKey(),
  builtIn: boolean('built_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  'products',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    // Renaming a category cascades to every product that uses it.
    category: text()
      .notNull()
      .references(() => categories.name, { onUpdate: 'cascade' }),
    price: money('price').notNull(),
    stock: integer().notNull().default(0),
    icon: text().notNull().default('🛒'),
    unit: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('products_category_idx').on(table.category)],
);

export const orders = pgTable(
  'orders',
  {
    id: text().primaryKey(),
    customerName: text('customer_name').notNull(),
    customerMobile: text('customer_mobile').notNull(),
    subtotal: money('subtotal').notNull(),
    tax: money('tax').notNull(),
    total: money('total').notNull(),
    // 'pending' | 'completed' | 'cancelled'
    status: text().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_created_at_idx').on(table.createdAt),
    index('orders_customer_mobile_idx').on(table.customerMobile),
  ],
);

// Order lines snapshot product details so history survives product edits/deletes.
export const orderItems = pgTable(
  'order_items',
  {
    id: serial().primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    name: text().notNull(),
    category: text().notNull(),
    unit: text().notNull(),
    icon: text().notNull(),
    unitPrice: money('unit_price').notNull(),
    quantity: integer().notNull(),
    lineTotal: money('line_total').notNull(),
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
);

export const productRequests = pgTable('product_requests', {
  id: text().primaryKey(),
  productName: text('product_name').notNull(),
  details: text().notNull().default(''),
  customerName: text('customer_name').notNull(),
  customerMobile: text('customer_mobile').notNull(),
  // 'pending' | 'reviewed'
  status: text().notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
