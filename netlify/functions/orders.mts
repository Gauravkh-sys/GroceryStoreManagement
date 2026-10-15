import type { Config, Context } from '@netlify/functions';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, orderItems, orders, products } from '../../db/schema.js';
import {
  error,
  isValidMobile,
  json,
  methodNotAllowed,
  normalizeMobile,
  readJson,
  requireManagerApiToken,
  roundMoney,
  toMoney,
  trimmed,
} from '../lib/http.js';

const TAX_RATE = 0.08;

type OrderInput = {
  customerName: string;
  customerMobile: string;
  items: { productId: string; quantity: number }[];
};

class StockChangedError extends Error {}

const loadOrders = async (filter?: { mobile?: string; id?: string }) => {
  const where = filter?.id
    ? eq(orders.id, filter.id)
    : filter?.mobile
      ? eq(orders.customerMobile, filter.mobile)
      : undefined;
  const orderRows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt));
  if (orderRows.length === 0) {
    return [];
  }
  const lineRows = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderRows.map((order) => order.id)))
    .orderBy(orderItems.id);

  return orderRows.map((order) => ({
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customerName,
    customerMobile: order.customerMobile,
    subtotal: toMoney(order.subtotal),
    tax: toMoney(order.tax),
    total: toMoney(order.total),
    status: order.status,
    items: lineRows
      .filter((line) => line.orderId === order.id)
      .map((line) => ({
        productId: line.productId,
        name: line.name,
        category: line.category,
        unit: line.unit,
        icon: line.icon,
        unitPrice: toMoney(line.unitPrice),
        quantity: line.quantity,
        lineTotal: toMoney(line.lineTotal),
      })),
  }));
};

const createOrder = async (req: Request) => {
  const body = await readJson<OrderInput>(req);
  const customerName = trimmed(body?.customerName);
  const customerMobile = normalizeMobile(body?.customerMobile);
  if (
    !customerName ||
    customerName.length > 60 ||
    !isValidMobile(customerMobile)
  ) {
    return error(400, 'invalid-customer', 'Enter a name and a 10-digit mobile number.');
  }

  if (!Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 50) {
    return error(400, 'invalid-cart', 'The order must contain 1-50 valid products.');
  }

  const quantities = new Map<string, number>();
  for (const item of body.items) {
    if (
      !item ||
      typeof item.productId !== 'string' ||
      item.productId.length === 0 ||
      item.productId.length > 100 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > 9999
    ) {
      return error(400, 'invalid-cart', 'The order contains an invalid product or quantity.');
    }
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (quantity > 9999) {
      return error(400, 'invalid-cart', 'Product quantity cannot exceed 9999.');
    }
    quantities.set(item.productId, quantity);
  }

  const orderId = `DGS-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  try {
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ product: products })
        .from(products)
        .innerJoin(categories, eq(products.category, categories.name))
        .where(and(inArray(products.id, [...quantities.keys()]), eq(categories.active, true)));
      if (rows.length !== quantities.size) {
        throw new StockChangedError();
      }

      const lines = rows.map(({ product }) => {
        const quantity = quantities.get(product.id)!;
        const unitPrice = toMoney(product.price);
        return { product, quantity, unitPrice, lineTotal: roundMoney(unitPrice * quantity) };
      });

      // Conditional decrement guards against two customers buying the last unit at once.
      for (const line of lines) {
        const [updated] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${line.quantity}` })
          .where(and(eq(products.id, line.product.id), gte(products.stock, line.quantity)))
          .returning({ id: products.id });
        if (!updated) {
          throw new StockChangedError();
        }
      }

      const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
      const tax = roundMoney(subtotal * TAX_RATE);
      await tx.insert(orders).values({
        id: orderId,
        customerName,
        customerMobile,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: roundMoney(subtotal + tax).toFixed(2),
      });
      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId,
          productId: line.product.id,
          name: line.product.name,
          category: line.product.category,
          unit: line.product.unit,
          icon: line.product.icon,
          unitPrice: line.unitPrice.toFixed(2),
          quantity: line.quantity,
          lineTotal: line.lineTotal.toFixed(2),
        })),
      );
    });
  } catch (cause) {
    if (cause instanceof StockChangedError) {
      return error(409, 'stock-changed', 'Some items are no longer available in that quantity.');
    }
    throw cause;
  }

  const [order] = await loadOrders({ id: orderId });
  return json(order, 201);
};

// PATCH /api/orders/:id  { status: 'completed' | 'cancelled' }
const updateStatus = async (req: Request, orderId: string) => {
  const body = await readJson<{ status: string }>(req);
  const status = body?.status;
  if (status !== 'completed' && status !== 'cancelled') {
    return error(400, 'invalid-status', 'Status must be completed or cancelled.');
  }

  const changed = await db.transaction(async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ status })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')))
      .returning({ id: orders.id });
    if (!order) {
      return false;
    }
    if (status === 'cancelled') {
      // Return the reserved stock for products that still exist.
      const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const line of lines) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${line.quantity}` })
          .where(eq(products.id, line.productId));
      }
    }
    return true;
  });

  if (!changed) {
    return error(409, 'not-pending', 'Only pending orders can be updated.');
  }
  const [order] = await loadOrders({ id: orderId });
  return json(order);
};

export default async (req: Request, context: Context) => {
  const orderId = context.params['id'] ?? null;

  if (req.method === 'GET' && !orderId) {
    const authError = requireManagerApiToken(req);
    if (authError) return authError;
    const mobile = normalizeMobile(new URL(req.url).searchParams.get('mobile') ?? '');
    return json(await loadOrders(mobile ? { mobile } : undefined));
  }
  if (req.method === 'POST' && !orderId) {
    return createOrder(req);
  }
  if (req.method === 'PATCH' && orderId) {
    const authError = requireManagerApiToken(req);
    if (authError) return authError;
    return updateStatus(req, orderId);
  }
  return methodNotAllowed();
};

export const config: Config = {
  path: ['/api/orders', '/api/orders/:id'],
};
