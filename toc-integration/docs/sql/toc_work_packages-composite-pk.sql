-- toc_work_packages: allow one row per (toc_id, year)
-- Run on test/staging BEFORE re-syncing 2025 and 2026 phases.

-- 1) Backfill legacy rows (adjust if your 2025 data used another year)
UPDATE toc_work_packages SET year = 2025 WHERE year IS NULL;

-- 2) Ensure no duplicate (toc_id, year) before adding PK
SELECT toc_id, year, COUNT(*) AS cnt
FROM toc_work_packages
GROUP BY toc_id, year
HAVING cnt > 1;

-- 3) year required for composite PK
ALTER TABLE toc_work_packages
  MODIFY COLUMN year INT NOT NULL DEFAULT 2025;

-- 4) Replace single-column PK with composite PK
ALTER TABLE toc_work_packages
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (toc_id, year);
