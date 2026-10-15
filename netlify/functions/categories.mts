import type { Config, Context } from '@netlify/functions';
import { asc, eq, ne, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';
import { error, json, methodNotAllowed, readJson, trimmed } from '../lib/http.js';

const MAX_NAME_LENGTH = 40;

const nameTaken = async (name: string, exceptName?: string) => {
  const match = sql`lower(${categories.name}) = lower(${name})`;
  const [row] = await db
    .select({ name: categories.name })
    .from(categories)
    .where(exceptName ? and(match, ne(categories.name, exceptName)) : match)
    .limit(1);
  return Boolean(row);
};

export default async (req: Request, context: Context) => {
  const currentName = context.params['name'] ? decodeURIComponent(context.params['name']) : null;

  if (req.method === 'GET' && !currentName) {
    const rows = await db
      .select({ name: categories.name, active: categories.active })
      .from(categories)
      .orderBy(asc(categories.id));
    return json(rows);
  }

  if (req.method === 'POST' && !currentName) {
    const body = await readJson<{ name: string }>(req);
    const name = trimmed(body?.name);
    if (!name || name.length > MAX_NAME_LENGTH) {
      return error(400, 'invalid-name', 'Category name must be 1-40 characters.');
    }
    if (await nameTaken(name)) {
      return error(409, 'duplicate', 'A category with that name already exists.');
    }
    const [row] = await db
      .insert(categories)
      .values({ name })
      .returning({ name: categories.name, active: categories.active });
    return json(row, 201);
  }

  // PATCH /api/categories/:name  { name?: string, active?: boolean }
  if (req.method === 'PATCH' && currentName) {
    const body = await readJson<{ name: string; active: boolean }>(req);
    const [existing] = await db.select().from(categories).where(eq(categories.name, currentName));
    if (!existing) {
      return error(404, 'not-found', 'Category not found.');
    }

    const update: { name?: string; active?: boolean } = {};
    if (body?.name !== undefined) {
      const name = trimmed(body.name);
      if (!name || name.length > MAX_NAME_LENGTH) {
        return error(400, 'invalid-name', 'Category name must be 1-40 characters.');
      }
      if (await nameTaken(name, currentName)) {
        return error(409, 'duplicate', 'A category with that name already exists.');
      }
      update.name = name;
    }
    if (typeof body?.active === 'boolean') {
      if (body.active === existing.active) {
        return error(409, body.active ? 'already-active' : 'already-archived', 'No change needed.');
      }
      update.active = body.active;
    }
    if (Object.keys(update).length === 0) {
      return json({ name: existing.name, active: existing.active });
    }

    // Product rows follow a rename automatically via ON UPDATE CASCADE.
    const [row] = await db
      .update(categories)
      .set(update)
      .where(eq(categories.name, currentName))
      .returning({ name: categories.name, active: categories.active });
    return json(row);
  }

  return methodNotAllowed();
};

export const config: Config = {
  path: ['/api/categories', '/api/categories/:name'],
};
