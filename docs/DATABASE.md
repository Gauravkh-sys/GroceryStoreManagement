# Database

Durvijay General Store stores its data in **Netlify Database**, a managed Postgres database. The Angular app never
talks to the database directly. It calls a small REST API (`/api/*`) built with Netlify Functions, and those functions
read and write the database through Drizzle ORM.

```
Angular UI ──HttpClient──▶ /api/* (netlify/functions) ──Drizzle──▶ Netlify Database (Postgres)
```

## What is in the repo

| Path | Purpose |
| --- | --- |
| `db/schema.ts` | Table definitions. This is the source of truth for the schema. |
| `db/index.ts` | Drizzle client. The connection is configured automatically by Netlify. |
| `drizzle.config.ts` | Drizzle Kit config. Migrations are written to `netlify/database/migrations`. |
| `netlify/database/migrations/` | SQL migrations. Netlify applies them automatically on every deploy. |
| `netlify/functions/*.mts` | REST endpoints, one file per resource. |
| `netlify/lib/http.ts` | Shared response, validation and money helpers for the functions. |
| `src/app/services/store-api.service.ts` | Typed Angular client for the endpoints. |

## Tables

| Table | Key columns | Notes |
| --- | --- | --- |
| `categories` | `name` (unique), `department`, `description`, `active` | `department` is the top-level aisle; `name` is the product subcategory. Archived categories are `active = false`. Renaming one also renames it on every product (`ON UPDATE CASCADE`). |
| `units` | `name` (PK), `built_in` | Built-in units can't be deleted. |
| `products` | `id`, `name`, `category` → `categories.name`, `price`, `stock`, `icon`, `unit` | `price` is `numeric(10,2)`. |
| `orders` | `id` (`DGS-…`), customer name/mobile, `subtotal`, `tax`, `total`, `status` | Status is `pending`, `completed` or `cancelled`. |
| `order_items` | `order_id` → `orders.id`, product snapshot, `unit_price`, `quantity`, `line_total` | Stores a copy of product details, so order history stays correct after a product is edited or deleted. |
| `product_requests` | `id` (`REQ-…`), `product_name`, `details`, customer, `status` | Status is `pending` or `reviewed`. |

The second migration (`seed_initial_store_data`) adds default categories, units and 10 demo products.
The `add_category_hierarchy` migration adds department and description metadata, maps the original category
names onto the new subcategories, and seeds the full department catalog.

## API reference

On failure, every endpoint returns `{ "error": "<code>", "message": "<text>" }`. The `error` codes match the result
codes the UI already uses (`duplicate`, `invalid-name`, `stock-changed`, …). Read them with `storeApiErrorCode()`
from `store-api.service.ts`.

| Method & path | Body | Success | Error codes |
| --- | --- | --- | --- |
| `GET /api/products` | — | `Product[]` | |
| `POST /api/products` | `Omit<Product,'id'>` | `201 Product` | `invalid-product`, `inactive-category` |
| `PATCH /api/products/:id` | `{ price?, stock? }` | `Product` | `invalid-product`, `not-found` |
| `DELETE /api/products/:id` | — | `204` | `not-found` |
| `GET /api/categories` | — | `GroceryCategory[]` | |
| `POST /api/categories` | `{ name, department, description? }` | `201 GroceryCategory` | `invalid-name`, `invalid-department`, `invalid-description`, `duplicate` |
| `PATCH /api/categories/:name` | `{ name?, department?, description?, active? }` to edit or archive/restore | `GroceryCategory` | `not-found`, `invalid-name`, `invalid-department`, `invalid-description`, `duplicate`, `already-archived`, `already-active` |
| `GET /api/units` | — | `string[]` | |
| `POST /api/units` | `{ name }` | `201 string` | `invalid-name`, `duplicate` |
| `DELETE /api/units/:name` | — | `204` | `not-found`, `in-use` |
| `GET /api/orders[?mobile=XXXXXXXXXX]` | — | `StoreOrder[]` (newest first) | |
| `POST /api/orders` | `{ customerName, customerMobile, items: CartItem[] }` | `201 StoreOrder` | `invalid-customer`, `empty-cart`, `stock-changed` |
| `PATCH /api/orders/:id` | `{ status: 'completed'\|'cancelled' }` | `StoreOrder` | `invalid-status`, `not-pending` |
| `GET /api/product-requests` | — | `ProductRequest[]` | |
| `POST /api/product-requests` | `{ productName, details, customerName, customerMobile }` | `201 ProductRequest` | `invalid-request` |
| `PATCH /api/product-requests/:id` | `{ status: 'pending'\|'reviewed' }` | `ProductRequest` | `invalid-status`, `not-found` |

`POST /api/orders` runs inside a single transaction. It reads prices from the database rather than trusting the
client, then lowers stock only where enough is left. If two customers try to buy the last item at the same time, one
of them gets `stock-changed`. Cancelling a pending order adds its stock back.

## Integrating the UI, step by step

`provideHttpClient(withFetch())` is already registered in `app.config.ts`, and `StoreApiService` is ready to inject.
The components keep reading signals from `GroceryStoreService`. The only change is inside that service: it loads from
and saves to the API instead of `localStorage`. This means most components need little or no change.

### Step 1: Load server data in `GroceryStoreService`

1. Inject `StoreApiService`.
2. In the constructor (browser only), stop restoring `products`, `categories`, `units`, `orders` and `requests` from
   `localStorage`. Load them from the API instead:

   ```ts
   private readonly api = inject(StoreApiService);
   readonly loading = signal(true);
   readonly loadError = signal<string | null>(null);

   refresh(): void {
     forkJoin({
       products: this.api.getProducts(),
       categories: this.api.getCategories(),
       units: this.api.getUnits(),
       orders: this.api.getOrders(),
       requests: this.api.getProductRequests(),
     }).subscribe({
       next: (data) => {
         this.productState.set(data.products);
         this.categoryState.set(data.categories);
         this.unitState.set(data.units);
         this.orderState.set(data.orders);
         this.requestState.set(data.requests);
         this.loading.set(false);
       },
       error: () => {
         this.loadError.set('Unable to load store data.');
         this.loading.set(false);
       },
     });
   }
   ```

3. **Keep the cart in `localStorage`.** It is per-device and doesn't need a server. Reduce `StoreSnapshot` to
   `{ cart }`.
4. In `app.html`, show a loading or error state using `store.loading()` and `store.loadError()`.

### Step 2: Make mutations asynchronous

Each mutation method currently returns its result synchronously. Change each one to return an `Observable` of the
same result type. On success, update the local signal from the server response:

```ts
addCategory(
  category: Pick<GroceryCategory, 'name' | 'department' | 'description'>,
): Observable<CategoryMutationResult> {
  return this.api.addCategory(category).pipe(
    tap((category) => this.categoryState.update((list) => [...list, category])),
    map((): CategoryMutationResult => 'success'),
    catchError((err) => of((storeApiErrorCode(err) ?? 'invalid-name') as CategoryMutationResult)),
  );
}
```

Keep the existing client-side validation as a fast first check. The server checks everything again.

### Step 3: Update each screen

| UI | File | Store methods → API | What to change in the component |
| --- | --- | --- | --- |
| Storefront & checkout | `app.ts` | `products`, `activeCategories` (loaded in Step 1). `createOrder` → `api.createOrder(name, mobile, cartState())`. | `subscribe` to `createOrder(...)`. On success, prepend the returned order, clear the cart, and call `api.getProducts()` to pick up the new stock. Map `stock-changed` to the existing toast. Disable the checkout button while the request is in flight. |
| Product card | `product-card.ts` | `isCategoryActive` (local, no change) | None. |
| Inventory panel | `inventory-panel.ts` | `addProduct` → `api.addProduct`, `deleteProduct` → `api.deleteProduct` | `subscribe`. Set the `unavailable` error on the category control when the code is `inactive-category`. Remove the product from `productState` only after a `204`. |
| Category master | `category-master.ts` | `addCategory` → `api.addCategory`, `renameCategory` → `api.updateCategory(old, { name })`, `archiveCategory` / `restoreCategory` → `api.updateCategory(name, { active })` | `subscribe` and pass the result into the existing `showError(result)` or success message. After a rename, also rename the category on products locally (or reload products). The database already cascades it. |
| Unit master | `unit-master.ts` | `addUnit` → `api.addUnit`, `removeUnit` → `api.removeUnit` | `subscribe`. Show the existing messages for `duplicate` / `in-use`. |
| Product request (customer) | `product-request.ts` | `createProductRequest` → `api.createProductRequest` | `subscribe`. Show the success message only after `201`. |
| Order management (manager) | `order-management.ts` | `updateOrderStatus` → `api.updateOrderStatus`, `updateProductRequestStatus` → `api.updateProductRequestStatus` | `subscribe` and replace the order or request in its signal with the returned one. After a cancellation, reload products so the restored stock appears. |
| Sales dashboard | `sales-dashboard.ts` | `orders` (loaded in Step 1) | None. Its `computed` totals keep working on the API data. Optionally call `store.refresh()` when the dashboard opens. |
| Login screen | `login-screen.ts` | — | None for the database. See "Security" below. |
| Customer order history (optional) | — | `api.getOrders(mobile)` | Use the signed-in customer's mobile number to list only their orders. |

### Step 4: Remove demo-only code

Once every screen uses the API, delete `INITIAL_PRODUCTS` (the seed migration replaces it), the `isStoreSnapshot` /
`isStoreOrder` / `isProductRequest` guards, and the old `durvijay-store-demo-v1` key. You can clear the old key once
with `localStorage.removeItem('durvijay-store-demo-v1')`.

### Step 5: Run locally

```bash
netlify dev            # serves Angular and the /api/* functions together
```

`ng serve` alone doesn't run the functions. Use `netlify dev` while working on the UI.

## Changing the schema

1. Edit `db/schema.ts`.
2. Run `npx drizzle-kit generate --name <imperative_snake_case_description>` (for example, `add_products_barcode`).
3. Commit the new folder in `netlify/database/migrations/`. Netlify applies it automatically before the deploy is
   published. Deploy previews get their own copy of the database branch.

Never edit a migration that has already been deployed. Add a new migration instead.

## Security

Sign-in is currently a front-end demo: the accounts are hard-coded in `login-screen.ts`. The manager endpoints
(products, categories, units, order status, request status, and listing all orders) don't check who is calling.
**Add real authentication before using this with real customers.** Netlify Identity is the simplest option: verify
the user and their `manager` role in each function that changes data, and restrict `GET /api/orders` without
`?mobile=` to managers.
