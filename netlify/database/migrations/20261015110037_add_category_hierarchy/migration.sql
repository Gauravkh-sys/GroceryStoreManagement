ALTER TABLE "categories" ADD COLUMN "department" text DEFAULT 'Other Essentials' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
INSERT INTO "categories" ("name", "department", "description", "active")
SELECT 'Vegetables & Fruits', 'Grocery & Kitchen', 'Fresh seasonal produce, daily greens, and root vegetables', "active"
FROM "categories" WHERE "name" = 'Fruits & Vegetables'
ON CONFLICT ("name") DO UPDATE SET "active" = "categories"."active" AND EXCLUDED."active";--> statement-breakpoint
UPDATE "products" SET "category" = 'Vegetables & Fruits' WHERE "category" = 'Fruits & Vegetables';--> statement-breakpoint
DELETE FROM "categories" WHERE "name" = 'Fruits & Vegetables';--> statement-breakpoint
INSERT INTO "categories" ("name", "department", "description", "active")
SELECT 'Dairy, Bread & Eggs', 'Grocery & Kitchen', 'Milk, curd, paneer, butter, cheese, bread, and eggs', "active"
FROM "categories" WHERE "name" = 'Dairy & Eggs'
ON CONFLICT ("name") DO UPDATE SET "active" = "categories"."active" AND EXCLUDED."active";--> statement-breakpoint
UPDATE "products" SET "category" = 'Dairy, Bread & Eggs' WHERE "category" = 'Dairy & Eggs';--> statement-breakpoint
DELETE FROM "categories" WHERE "name" = 'Dairy & Eggs';--> statement-breakpoint
INSERT INTO "categories" ("name", "department", "description", "active")
SELECT 'Bakery & Biscuits', 'Grocery & Kitchen', 'Sliced bread, rusks, cookies, and baked snacks', "active"
FROM "categories" WHERE "name" = 'Bakery & Snacks'
ON CONFLICT ("name") DO UPDATE SET "active" = "categories"."active" AND EXCLUDED."active";--> statement-breakpoint
UPDATE "products" SET "category" = 'Bakery & Biscuits' WHERE "category" = 'Bakery & Snacks';--> statement-breakpoint
DELETE FROM "categories" WHERE "name" = 'Bakery & Snacks';--> statement-breakpoint
INSERT INTO "categories" ("name", "department", "description", "active")
SELECT 'Drinks & Juices', 'Snacks & Drinks', 'Cold drinks, sodas, packaged juices, and coconut water', "active"
FROM "categories" WHERE "name" = 'Beverages'
ON CONFLICT ("name") DO UPDATE SET "active" = "categories"."active" AND EXCLUDED."active";--> statement-breakpoint
UPDATE "products" SET "category" = 'Drinks & Juices' WHERE "category" = 'Beverages';--> statement-breakpoint
DELETE FROM "categories" WHERE "name" = 'Beverages';--> statement-breakpoint
INSERT INTO "categories" ("name", "department", "description", "active")
SELECT 'Home & Lifestyle', 'Other Essentials', 'Cleaners, detergents, insect repellents, and air fresheners', "active"
FROM "categories" WHERE "name" = 'Household Essentials'
ON CONFLICT ("name") DO UPDATE SET "active" = "categories"."active" AND EXCLUDED."active";--> statement-breakpoint
UPDATE "products" SET "category" = 'Home & Lifestyle' WHERE "category" = 'Household Essentials';--> statement-breakpoint
DELETE FROM "categories" WHERE "name" = 'Household Essentials';--> statement-breakpoint
INSERT INTO "categories" ("name", "department", "description") VALUES
  ('Vegetables & Fruits', 'Grocery & Kitchen', 'Fresh seasonal produce, daily greens, and root vegetables'),
  ('Atta, Rice & Dal', 'Grocery & Kitchen', 'Wheat flour, grains, lentils, and pulses'),
  ('Oil, Ghee & Masala', 'Grocery & Kitchen', 'Cooking oils, desi ghee, spices, and seasonings'),
  ('Dairy, Bread & Eggs', 'Grocery & Kitchen', 'Milk, curd, paneer, butter, cheese, bread, and eggs'),
  ('Bakery & Biscuits', 'Grocery & Kitchen', 'Sliced bread, rusks, cookies, and baked snacks'),
  ('Dry Fruits & Cereals', 'Grocery & Kitchen', 'Nuts, raisins, breakfast cereals, and oats'),
  ('Chips & Namkeen', 'Snacks & Drinks', 'Potato chips, bhujia, crisps, and traditional snacks'),
  ('Sweets & Chocolates', 'Snacks & Drinks', 'Chocolates, candies, traditional mithai, and desserts'),
  ('Drinks & Juices', 'Snacks & Drinks', 'Cold drinks, sodas, packaged juices, and coconut water'),
  ('Tea, Coffee & Milk Drinks', 'Snacks & Drinks', 'Tea leaves, instant coffee, and health beverage mixes'),
  ('Instant Food', 'Snacks & Drinks', 'Noodles, pasta, soup mixes, and ready-to-eat meals'),
  ('Sauces & Spreads', 'Snacks & Drinks', 'Ketchup, jams, peanut butter, and dips'),
  ('Paan Corner', 'Snacks & Drinks', 'Mouth fresheners, rolling papers, and related items'),
  ('Ice Creams & More', 'Snacks & Drinks', 'Ice cream tubs, sticks, and frozen desserts'),
  ('Bath & Body', 'Beauty & Personal Care', 'Soaps, shower gels, body lotions, and talc'),
  ('Hair', 'Beauty & Personal Care', 'Shampoos, conditioners, hair oils, and styling products'),
  ('Skin & Face', 'Beauty & Personal Care', 'Face wash, moisturizers, serums, and sunscreens'),
  ('Beauty & Cosmetics', 'Beauty & Personal Care', 'Makeup, kajal, lipsticks, and beauty accessories'),
  ('Feminine Hygiene', 'Beauty & Personal Care', 'Sanitary pads, liners, and personal hygiene goods'),
  ('Baby Care', 'Beauty & Personal Care', 'Diapers, baby wipes, baby food, and skin care'),
  ('Health & Pharma', 'Beauty & Personal Care', 'OTC medicines, antacids, band-aids, and supplements'),
  ('Sexual Wellness', 'Beauty & Personal Care', 'Condoms, lubricants, and wellness essentials'),
  ('Home & Lifestyle', 'Other Essentials', 'Cleaners, detergents, insect repellents, and air fresheners'),
  ('Electronics', 'Other Essentials', 'Mobile accessories, chargers, earphones, and batteries'),
  ('Stationery & Games', 'Other Essentials', 'Notebooks, pens, toys, and indoor games'),
  ('Pet Care', 'Other Essentials', 'Pet food, treats, and grooming supplies')
ON CONFLICT ("name") DO UPDATE SET
  "department" = EXCLUDED."department",
  "description" = EXCLUDED."description";