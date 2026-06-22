-- toc_work_packages: allow one row per (toc_id, year)
-- Prod fix when DROP INDEX fails with: needed in a foreign key constraint

-- 0) Find FK(s) referencing toc_work_packages.toc_id
SELECT
  kcu.CONSTRAINT_NAME,
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.REFERENCED_TABLE_NAME,
  kcu.REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.TABLE_SCHEMA = DATABASE()
  AND kcu.REFERENCED_TABLE_NAME = 'toc_work_packages'
  AND kcu.REFERENCED_COLUMN_NAME = 'toc_id';

-- Also inspect child table DDL (usually toc_results.wp_id)
SHOW CREATE TABLE toc_results;

-- 1) Backfill legacy rows (if not done)
UPDATE toc_work_packages SET year = 2025 WHERE year IS NULL;

-- 2) Ensure no duplicate (toc_id, year)
SELECT toc_id, year, COUNT(*) AS cnt
FROM toc_work_packages
GROUP BY toc_id, year
HAVING cnt > 1;

-- 3) Drop FK on toc_results.wp_id -> toc_work_packages.toc_id
--    Replace <FK_NAME> with CONSTRAINT_NAME from step 0 (prod example below).
ALTER TABLE toc_results
  DROP FOREIGN KEY fk_toc_results_work_package;

-- 4) Drop legacy UNIQUE on toc_id alone (blocks year=2026 inserts)
ALTER TABLE toc_work_packages
  DROP INDEX uq_toc_work_packages_toc_id;

-- 5) Composite PK (skip if already PRIMARY KEY (toc_id, year))
-- ALTER TABLE toc_work_packages
--   DROP PRIMARY KEY,
--   ADD PRIMARY KEY (toc_id, year);

-- 6) Verify
SHOW INDEX FROM toc_work_packages;

-- NOTE: toc_results.wp_id is no longer FK-enforced.
-- Reporting/sync must join toc_work_packages using (wp_id = toc_id AND year = reporting year).
-- Optional future: add toc_results.wp_year and FK (wp_id, wp_year) -> (toc_id, year).
