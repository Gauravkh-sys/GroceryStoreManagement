INSERT INTO "units" ("name", "built_in") VALUES
	('loaf', true),
	('pack of 3', true),
	('tub', true),
	('carton', true)
ON CONFLICT ("name") DO NOTHING;