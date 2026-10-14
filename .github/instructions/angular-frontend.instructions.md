---
name: Angular Frontend Guidelines
description: "Use when creating or modifying Angular components, templates, services, styles, or frontend tests in this Angular 21 and Tailwind CSS 4 workspace."
applyTo: "src/**"
---

# Angular Frontend Guidelines

- Follow the existing Angular 21 standalone architecture and reuse existing components, services, models, and styling patterns.
- Prefer Signals (`signal`, `computed`) for synchronous state; use RxJS for asynchronous streams and stream operators. Clean up subscriptions using Angular's supported lifecycle patterns.
- Use built-in template control flow (`@if`, `@for`, `@switch`) in new templates. Track repeated items by a stable identity.
- Use typed reactive forms and validate inputs at the boundary.
- Keep templates semantic and accessible: provide labels for controls, meaningful alternative text, keyboard support, visible focus, and appropriate ARIA only where native HTML is insufficient.
- Preserve responsive behavior and use the existing Tailwind CSS 4 setup; avoid adding a competing styling system.
- Keep services focused, models typed, and errors explicit. Do not silently swallow errors or hide failed operations behind default success states.
- Avoid unnecessary dependencies, unsafe casts, and unrelated refactoring.
- Add or update focused tests when the project has an applicable test setup. Before finishing, run the smallest relevant validation command and report failures accurately.
