import type { Config, Context } from '@netlify/functions';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { products, units } from '../../db/schema.js';
import {
  error,
  json,
  methodNotAllowed,
  readJson,
  requireManagerApiToken,
  trimmed,
} from '../lib/http.js';

export default async (req: Request, context: Context) => {
  const unitName = context.params['name'] ? decodeURIComponent(context.params['name']) : null;

  if (req.method === 'GET' && !unitName) {
    const rows = await db.select({ name: units.name }).from(units).orderBy(asc(units.createdAt));
    return json(rows.map((row) => row.name));
  }

  if (req.method === 'POST' && !unitName) {
    const authError = requireManagerApiToken(req);
    if (authError) return authError;
    const body = await readJson<{ name: string }>(req);
    const name = trimmed(body?.name).toLocaleLowerCase();
    if (!name || name.length > 24) {
      return error(400, 'invalid-name', 'Unit name must be 1-24 characters.');
    }
    const [row] = await db
      .insert(units)
      .values({ name })
      .onConflictDoNothing()
      .returning({ name: units.name });
    if (!row) {
      return error(409, 'duplicate', 'That unit already exists.');
    }
    return json(row.name, 201);
  }

  if (req.method === 'DELETE' && unitName) {
    const authError = requireManagerApiToken(req);
    if (authError) return authError;
    const [unit] = await db.select().from(units).where(eq(units.name, unitName));
    if (!unit) {
      return error(404, 'not-found', 'Unit not found.');
    }
    const [usage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.unit, unitName));
    if (unit.builtIn || (usage?.count ?? 0) > 0) {
      return error(409, 'in-use', 'This unit is a built-in unit or is used by products.');
    }
    await db.delete(units).where(eq(units.name, unitName));
    return new Response(null, { status: 204 });
  }

  return methodNotAllowed();
};

export const config: Config = {
  path: ['/api/units', '/api/units/:name'],
};
