import type { Config, Context } from '@netlify/functions';
import { asc, eq, ne, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';
import { CATEGORY_DEPARTMENTS } from '../../src/app/data/category-data.js';
import { error, json, methodNotAllowed, readJson, trimmed } from '../lib/http.js';

const MAX_NAME_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 160;
const VALID_DEPARTMENTS = new Set(
  CATEGORY_DEPARTMENTS.map((department) => department.name),
);

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
      .select({
        name: categories.name,
        department: categories.department,
        description: categories.description,
        active: categories.active,
      })
      .from(categories)
      .orderBy(asc(categories.id));
    return json(rows);
  }

  if (req.method === 'POST' && !currentName) {
    const body = await readJson<{
      name: string;
      department: string;
      description?: string;
    }>(req);
    const name = trimmed(body?.name);
    const department = trimmed(body?.department);
    const description = trimmed(body?.description);
    if (!name || name.length > MAX_NAME_LENGTH) {
      return error(400, 'invalid-name', 'Category name must be 1-40 characters.');
    }
    if (!VALID_DEPARTMENTS.has(department)) {
      return error(400, 'invalid-department', 'Choose a supported category department.');
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return error(400, 'invalid-description', 'Category description must not exceed 160 characters.');
    }
    if (await nameTaken(name)) {
      return error(409, 'duplicate', 'A category with that name already exists.');
    }
    const [row] = await db
      .insert(categories)
      .values({ name, department, description })
      .returning({
        name: categories.name,
        department: categories.department,
        description: categories.description,
        active: categories.active,
      });
    return json(row, 201);
  }

  // PATCH /api/categories/:name  { name?, department?, description?, active? }
  if (req.method === 'PATCH' && currentName) {
    const body = await readJson<{
      name?: string;
      department?: string;
      description?: string;
      active?: boolean;
    }>(req);
    const [existing] = await db.select().from(categories).where(eq(categories.name, currentName));
    if (!existing) {
      return error(404, 'not-found', 'Category not found.');
    }

    const update: {
      name?: string;
      department?: string;
      description?: string;
      active?: boolean;
    } = {};
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
    if (body?.department !== undefined) {
      const department = trimmed(body.department);
      if (!VALID_DEPARTMENTS.has(department)) {
        return error(400, 'invalid-department', 'Choose a supported category department.');
      }
      update.department = department;
    }
    if (body?.description !== undefined) {
      const description = trimmed(body.description);
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return error(400, 'invalid-description', 'Category description must not exceed 160 characters.');
      }
      update.description = description;
    }
    if (typeof body?.active === 'boolean') {
      if (body.active === existing.active) {
        return error(409, body.active ? 'already-active' : 'already-archived', 'No change needed.');
      }
      update.active = body.active;
    }
    if (Object.keys(update).length === 0) {
      return json(existing);
    }

    // Product rows follow a rename automatically via ON UPDATE CASCADE.
    const [row] = await db
      .update(categories)
      .set(update)
      .where(eq(categories.name, currentName))
      .returning({
        name: categories.name,
        department: categories.department,
        description: categories.description,
        active: categories.active,
      });
    return json(row);
  }

  return methodNotAllowed();
};

export const config: Config = {
  path: ['/api/categories', '/api/categories/:name'],
};
