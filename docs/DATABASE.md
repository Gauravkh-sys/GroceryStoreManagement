# Database

Durvijay General Store uses Netlify Database (Postgres). The Angular app calls REST endpoints implemented as Netlify
Functions; it does not connect directly to Postgres.

```text
Angular UI --HttpClient--> /api/* (Netlify Functions) --Drizzle--> Netlify Database
```

## Project components

| Path | Purpose |
| --- | --- |
| `db/schema.ts` | Drizzle table definitions. |
| `db/index.ts` | Drizzle client configured for Netlify Database. |
| `drizzle.config.ts` | Drizzle Kit configuration. |
| `netlify/database/migrations/` | SQL migration history. |
| `netlify/functions/*.mts` | REST endpoints. |
| `netlify/lib/http.ts` | Shared response, validation, size-limit, and manager-token helpers. |
| `src/app/services/store-api.service.ts` | Typed Angular API client. |

## Tables

| Table | Key columns | Notes |
| --- | --- | --- |
| `categories` | `name`, `active` | Category names are unique; rename cascades to products. |
| `units` | `name`, `built_in` | Built-in units cannot be deleted. |
| `products` | `id`, `name`, `category`, `price`, `stock`, `icon`, `unit` | Price is `numeric(10,2)`. |
| `orders` | `id`, customer name/mobile, totals, `status` | Order status is pending, completed, or cancelled. |
| `order_items` | `order_id`, product snapshot, price, quantity, line total | Keeps the purchased item details. |
| `product_requests` | `id`, product name, details, customer, `status` | Request status is pending or reviewed. |

The initial seed migration inserts default categories, units, and products. Products use `loaf`, `pack of 3`, `tub`,
and `carton`; those units must exist in the database before the seeded product rows can be inserted.

## API

Failures return `{ "error": "<code>", "message": "<text>" }`. The client exposes `storeApiErrorCode()` to read the
error code.

| Method and path | Body | Success |
| --- | --- | --- |
| `GET /api/products` | — | Product list |
| `POST /api/products` | Product fields | `201` and created product |
| `PATCH /api/products/:id` | `{ price?, stock? }` | Updated product |
| `DELETE /api/products/:id` | — | `204` |
| `GET /api/categories` | — | Category list |
| `POST /api/categories` | `{ name }` | `201` and created category |
| `PATCH /api/categories/:name` | `{ name? }` or `{ active }` | Updated category |
| `GET /api/units` | — | Unit list |
| `POST /api/units` | `{ name }` | `201` and created unit |
| `DELETE /api/units/:name` | — | `204` |
| `GET /api/orders?mobile=XXXXXXXXXX` | — | Matching orders |
| `POST /api/orders` | `{ customerName, customerMobile, items }` | `201` and created order |
| `PATCH /api/orders/:id` | `{ status: 'completed' \| 'cancelled' }` | Updated order |
| `GET /api/product-requests` | — | Product request list |
| `POST /api/product-requests` | `{ productName, details, customerName, customerMobile }` | `201` and created request |
| `PATCH /api/product-requests/:id` | `{ status: 'pending' \| 'reviewed' }` | Updated request |

Order creation is transactional: the server reads product prices from the database, reserves available stock, and
inserts the order and item rows together. A competing order that cannot reserve sufficient stock fails rather than
overselling.

## Current UI integration

The customer storefront loads products, categories, and units from the API. Checkout posts the customer and cart
lines to `POST /api/orders`. The cart is cleared and the bill is shown only after the server confirms the order.
Product requests are submitted to `POST /api/product-requests`, and the request form resets only after a successful
response. API failures are shown to the user; failed submissions do not discard the cart or form data.

Manager inventory, category and unit editing, order/request management, sales dashboard, login, and basket persistence
remain browser-local demo features. The UI does not currently use the manager API endpoints. Successful customer
orders and requests are retained in memory for the current page session, not exposed as persistent order/request
history in the UI.

## Local development and migrations

`ng serve` serves only the Angular app and cannot execute Netlify Functions. Configure Netlify Database for the site
and run the integrated app with:

```bash
npx netlify dev
```

Never place database credentials or manager tokens in Angular code or commit them to the repository. For a schema
change, edit `db/schema.ts`, generate a new migration using `npx drizzle-kit generate --name <description>`, review
the SQL, and apply it through the configured Netlify Database migration workflow. Never edit a migration that may
already have been applied.

## Security

Sign-in remains a front-end demo with hard-coded accounts. Manager-only API operations and reads fail closed unless
the server-side `STORE_MANAGER_API_TOKEN` is configured and supplied. Do not expose this token to browser code. This
token check is only a temporary safeguard, not user authentication; implement and verify server-side authentication
and authorization before connecting manager UI or using real customer data.
