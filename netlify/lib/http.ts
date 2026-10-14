export const json = (body: unknown, status = 200) => Response.json(body, { status });

export const error = (status: number, code: string, message: string) =>
  Response.json({ error: code, message }, { status });

export const methodNotAllowed = () => error(405, 'method-not-allowed', 'Method not allowed');

export async function readJson<T>(req: Request): Promise<Partial<T> | null> {
  try {
    const body: unknown = await req.json();
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
