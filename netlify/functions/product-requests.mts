import type { Config, Context } from '@netlify/functions';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { productRequests } from '../../db/schema.js';
import {
  error,
  isValidMobile,
  json,
  methodNotAllowed,
  normalizeMobile,
  readJson,
  trimmed,
} from '../lib/http.js';

type RequestInput = {
  productName: string;
  details: string;
  customerName: string;
  customerMobile: string;
  status: string;
};

const toProductRequest = (row: typeof productRequests.$inferSelect) => ({
  id: row.id,
  createdAt: row.createdAt.toISOString(),
  productName: row.productName,
  details: row.details,
  customerName: row.customerName,
  customerMobile: row.customerMobile,
  status: row.status,
});

export default async (req: Request, context: Context) => {
  const requestId = context.params['id'] ?? null;

  if (req.method === 'GET' && !requestId) {
    const rows = await db.select().from(productRequests).orderBy(desc(productRequests.createdAt));
    return json(rows.map(toProductRequest));
  }

  if (req.method === 'POST' && !requestId) {
    const body = await readJson<RequestInput>(req);
    const productName = trimmed(body?.productName);
    const customerName = trimmed(body?.customerName);
    const customerMobile = normalizeMobile(body?.customerMobile);
    if (
      productName.length < 2 ||
      productName.length > 60 ||
      !customerName ||
      !isValidMobile(customerMobile)
    ) {
      return error(400, 'invalid-request', 'Product request details are not valid.');
    }
    const [row] = await db
      .insert(productRequests)
      .values({
        id: `REQ-${crypto.randomUUID()}`,
        productName,
        customerName,
        customerMobile,
        details: trimmed(body?.details).slice(0, 240),
      })
      .returning();
    return json(toProductRequest(row), 201);
  }

  // PATCH /api/product-requests/:id  { status: 'pending' | 'reviewed' }
  if (req.method === 'PATCH' && requestId) {
    const body = await readJson<RequestInput>(req);
    if (body?.status !== 'pending' && body?.status !== 'reviewed') {
      return error(400, 'invalid-status', 'Status must be pending or reviewed.');
    }
    const [row] = await db
      .update(productRequests)
      .set({ status: body.status })
      .where(eq(productRequests.id, requestId))
      .returning();
    return row ? json(toProductRequest(row)) : error(404, 'not-found', 'Request not found.');
  }

  return methodNotAllowed();
};

export const config: Config = {
  path: ['/api/product-requests', '/api/product-requests/:id'],
};
