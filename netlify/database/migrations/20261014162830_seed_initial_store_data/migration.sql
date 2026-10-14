-- Seed the store with the same defaults the UI ships with in src/app/data/grocery-data.ts.
INSERT INTO "categories" ("name") VALUES
	('Fruits & Vegetables'),
	('Dairy & Eggs'),
	('Bakery & Snacks'),
	('Beverages'),
	('Household Essentials')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "units" ("name", "built_in") VALUES
	('item', true), ('kg', true), ('g', true), ('litre', true), ('pack', true),
	('bunch', true), ('dozen', true), ('bag', true), ('bottle', true)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "category", "price", "stock", "icon", "unit") VALUES
	('bananas', 'Fresh Organic Bananas', 'Fruits & Vegetables', 2.99, 45, '🍌', 'bunch'),
	('milk', 'Whole Milk 1L', 'Dairy & Eggs', 1.49, 30, '🥛', 'bottle'),
	('bread', 'Whole Wheat Bread', 'Bakery & Snacks', 2.49, 20, '🍞', 'loaf'),
	('avocados', 'Hass Avocados', 'Fruits & Vegetables', 4.99, 15, '🥑', 'pack of 3'),
	('yogurt', 'Greek Yogurt', 'Dairy & Eggs', 3.29, 25, '🥣', 'tub'),
	('juice', 'Orange Juice 1L', 'Beverages', 3.99, 18, '🍊', 'bottle'),
	('eggs', 'Free-Range Eggs 12pk', 'Dairy & Eggs', 4.50, 12, '🥚', 'carton'),
	('spinach', 'Organic Spinach', 'Fruits & Vegetables', 2.19, 22, '🥬', 'bag'),
	('coffee', 'Ground Coffee', 'Beverages', 8.49, 9, '☕', 'bag'),
	('dish-soap', 'Plant-Based Dish Soap', 'Household Essentials', 3.79, 14, '🧴', 'bottle')
ON CONFLICT ("id") DO NOTHING;
