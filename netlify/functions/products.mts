import type { Config, Context } from '@netlify/functions';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, products } from '../../db/schema.js';
import { error, json, methodNotAllowed, readJson, toMoney, trimmed } from '../lib/http.js';

type ProductInput = {
  name: string;
  category: string;
  price: number;
  stock: number;
  icon: string;
  unit: string;
};

const toProduct = (row: typeof products.$inferSelect) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: toMoney(row.price),
  stock: row.stock,
  icon: row.icon,
  unit: row.unit,
});

export default async (req: Request, context: Context) => {
  const productId = context.params['id'] ?? null;

  if (req.method === 'GET' && !productId) {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    return json(rows.map(toProduct));
  }

  if (req.method === 'POST' && !productId) {
    const body = await readJson<ProductInput>(req);
    const name = trimmed(body?.name);
    const category = trimmed(body?.category);
    const unit = trimmed(body?.unit);
    const price = Number(body?.price);
    const stock = Number(body?.stock);
    if (
      !name ||
      name.length > 80 ||
      !unit ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return error(400, 'invalid-product', 'Product details are not valid.');
    }

    const [activeCategory] = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.name, category), eq(categories.active, true)));
    if (!activeCategory) {
      return error(409, 'inactive-category', 'Choose an active category.');
    }

    const [row] = await db
      .insert(products)
      .values({
        id: `product-${crypto.randomUUID()}`,
        name,
        category,
        price: price.toFixed(2),
        stock,
        icon: trimmed(body?.icon) || '🛒',
        unit,
      })
      .returning();
    return json(toProduct(row), 201);
  }

  // PATCH /api/products/:id  { price?: number, stock?: number }
  if (req.method === 'PATCH' && productId) {
    const body = await readJson<ProductInput>(req);
    const update: { price?: string; stock?: number } = {};
    if (body?.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return error(400, 'invalid-product', 'Price is not valid.');
      }
      update.price = price.toFixed(2);
    }
    if (body?.stock !== undefined) {
      if (!Number.isInteger(body.stock) || body.stock < 0) {
        return error(400, 'invalid-product', 'Stock is not valid.');
      }
      update.stock = body.stock;
    }
    if (Object.keys(update).length === 0) {
      return error(400, 'invalid-product', 'Nothing to update.');
    }
    const [row] = await db.update(products).set(update).where(eq(products.id, productId)).returning();
    return row ? json(toProduct(row)) : error(404, 'not-found', 'Product not found.');
  }

  if (req.method === 'DELETE' && productId) {
    const [row] = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning({ id: products.id });
    return row ? new Response(null, { status: 204 }) : error(404, 'not-found', 'Product not found.');
  }

  return methodNotAllowed();
};

export const config: Config = {
  path: ['/api/products', '/api/products/:id'],
};
