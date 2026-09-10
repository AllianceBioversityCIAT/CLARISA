-- toc_results: store the ToC v3 result-level location (global / regional / country)
-- Required by the ToC API v3 adaptation (docs/toc-api-v3-compat-gap.md, hallazgo 2.3 / lote 1).
-- Run BEFORE deploying the code that writes toc_results.location.

-- 0) Pre-check (MySQL has no ADD COLUMN IF NOT EXISTS): expect 0 rows
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'toc_results'
  AND COLUMN_NAME = 'location';

-- 1) Add the column (values are stored lowercase; NULL when the ToC sends null)
ALTER TABLE toc_results
  ADD COLUMN location VARCHAR(50) NULL AFTER is_global;

-- 2) Verify
SELECT location, COUNT(*) AS cnt
FROM toc_results
GROUP BY location
ORDER BY cnt DESC;
