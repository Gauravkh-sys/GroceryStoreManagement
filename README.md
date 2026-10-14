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

## Deploy to Netlify

The included `netlify.toml` configures Netlify to use Node.js 22.22.2, run
`npm run build`, and publish Angular's browser output from
`dist/GroceryStoreManagement/browser`. It also rewrites client-side routes to
`index.html`, so refreshing or opening a deep link does not return a 404.

Connect the repository to Netlify and deploy with the default settings from
`netlify.toml`. If entering settings manually, use `npm run build` as the build
command and `dist/GroceryStoreManagement/browser` as the publish directory.

## Features

- Search products by name and filter the catalog by category.
- Add products to the basket, adjust quantities, remove items, and see the subtotal, 8% tax, and total update immediately.
- Complete checkout to decrement inventory and clear the basket.
- Switch to Inventory to add products with a validated reactive form or remove products.
- Manage categories by adding and renaming them, or archiving and restoring them. Archived categories disappear from shop filters and product forms; products already assigned to them remain visible but cannot be added to the basket until the category is restored.
- Product inventory, categories, basket, and checkout changes are held in the in-memory mock store and reset on refresh.

## Project structure

```text
src/
  app/
    components/
      category-master/      # Category creation, renaming, archiving, and restore
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
