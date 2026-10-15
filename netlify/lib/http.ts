export const json = (body: unknown, status = 200) => Response.json(body, { status });

export const error = (status: number, code: string, message: string) =>
  Response.json({ error: code, message }, { status });

export const methodNotAllowed = () => error(405, 'method-not-allowed', 'Method not allowed');

export function requireManagerApiToken(req: Request): Response | null {
  const expected = process.env['STORE_MANAGER_API_TOKEN'];
  if (!expected) {
    return error(
      503,
      'manager-api-disabled',
      'Manager database operations are disabled until server-side authentication is configured.',
    );
  }
  const authorization = req.headers.get('authorization') ?? '';
  const supplied = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  return supplied === expected
    ? null
    : error(401, 'unauthorized', 'Manager authorization is required.');
}

export async function readJson<T>(
  req: Request,
  maxBytes = 16_384,
): Promise<Partial<T> | null> {
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return null;
    }
    const body: unknown = JSON.parse(text);
    return typeof body === 'object' && body !== null ? (body as Partial<T>) : null;
  } catch {
    return null;
  }
}

/** Postgres numeric columns come back as strings; the UI works with numbers. */
export const toMoney = (value: string | number) => Number(value);

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const normalizeMobile = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : '';

export const isValidMobile = (mobile: string) => /^\d{10}$/.test(mobile);

export const trimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
