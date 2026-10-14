# freshly. grocery store

A responsive grocery storefront and lightweight inventory manager built with Angular 21 standalone components, signals, reactive forms, and Tailwind CSS 4.

## Run locally

Requirements: Node.js 22.22.2 and npm.

```bash
npm install
npm start
```

Open the local URL printed by Angular CLI (usually `http://localhost:4200`).

Create an optimized production build with:

```bash
npm run build
```

## Features

- Search products by name and filter the catalog by category.
- Add products to the basket, adjust quantities, remove items, and see the subtotal, 8% tax, and total update immediately.
- Complete checkout to decrement inventory and clear the basket.
- Switch to Inventory to add products with a validated reactive form or remove products.
- Product inventory, basket, and checkout changes are held in the in-memory mock store and reset on refresh.

## Project structure

```text
src/
  app/
    components/
      inventory-panel/       # Reactive product form and stock table
      product-card/          # Reusable catalog card
    data/
      grocery-data.ts        # Initial grocery catalog
    models/
      grocery.model.ts       # Product, category, and cart types
    services/
      grocery-store.service.ts # Signal-backed inventory and basket state
    app.html                 # Storefront, navigation, and cart drawer
    app.ts                   # Page state, search, and checkout orchestration
  styles.css                 # Tailwind import and shared design styles
.postcssrc.json              # Tailwind CSS PostCSS integration
```

Tailwind's PostCSS integration is configured in `.postcssrc.json`; global utilities are loaded from `src/styles.css`.
