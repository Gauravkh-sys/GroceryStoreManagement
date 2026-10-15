# freshly. grocery store

A responsive grocery storefront and lightweight inventory manager built with Angular 21 standalone components, signals, reactive forms, and Tailwind CSS 4.

## Run locally

Requirements: Node.js 22.22.2 and npm.

```bash
npm install
npm start
```

Open the local URL printed by Angular CLI (usually `http://localhost:4200`). This serves the Angular UI only;
database-backed customer flows require Netlify Functions and are not available through `ng serve` by itself.

To run the UI and Netlify Functions together, configure the site's Netlify Database integration and run:

```bash
npx netlify dev
```

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
- Place customer orders through the Netlify API; successful orders are saved with their item rows and stock is reserved transactionally. Print or save the returned itemized bill through the browser's PDF print dialog.
- Submit product requests through the Netlify API.
- Use the manager dashboard for demo sales and orders; manage inventory, products, categories, and units.
- Manager operations, sales dashboard, login, and basket persistence remain browser-local demo features. The customer catalog is loaded from the database API, and order/request submissions require Netlify Functions. There is no payment collection or production-ready authentication.
- Prepare an optional itemized order message for WhatsApp to the configured store number in `src/app/config/store-contact.ts`.
- Choose product icons from a searchable, grouped emoji library for groceries, grains, snacks, cleaning supplies, personal care, and farm essentials, or enter a custom emoji.
- Switch the interface between English and Hindi. Built-in products and categories and the generated WhatsApp order message follow the selected language; custom names remain as entered.
- Manage categories by adding and renaming them, or archiving and restoring them. Archived categories disappear from shop filters and product forms; products already assigned to them remain visible but cannot be added to the basket until the category is restored.
- Browser storage is local to the current browser/device. Clearing site storage removes demo records. Do not enter real customer or payment data.

## Project structure

```text
src/
  app/
    config/
      store-contact.ts     # WhatsApp order recipient
    components/
      category-master/      # Category creation, renaming, archiving, and restore
      inventory-panel/       # Reactive product form and stock table
      order-management/      # Demo order and product-request management
      product-request/       # Customer product suggestions
      product-card/          # Reusable catalog card
      sales-dashboard/       # Demo sales totals and best sellers
      unit-master/           # Product unit management
    data/
      grocery-data.ts        # Initial grocery catalog
    models/
      grocery.model.ts       # Product, category, and cart types
    services/
      grocery-store.service.ts # Signal-backed demo store state and local persistence
    app.html                 # Storefront, navigation, and cart drawer
    app.ts                   # Page state, search, and checkout orchestration
  styles.css                 # Tailwind import and shared design styles
.postcssrc.json              # Tailwind CSS PostCSS integration
```

Tailwind's PostCSS integration is configured in `.postcssrc.json`; global utilities are loaded from `src/styles.css`.
