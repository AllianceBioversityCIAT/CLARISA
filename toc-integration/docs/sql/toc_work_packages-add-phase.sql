-- toc_work_packages: store ToC phase UUID alongside reporting year
-- Run after toc_work_packages-composite-pk.sql (PK = toc_id, year)

-- 1) Add phase column
ALTER TABLE toc_work_packages
  ADD COLUMN phase VARCHAR(100) NULL AFTER year;

-- 2) Index for joins with toc_results.phase
CREATE INDEX idx_toc_work_packages_phase ON toc_work_packages (phase);
CREATE INDEX idx_toc_work_packages_toc_id_phase ON toc_work_packages (toc_id, phase);

-- 3) Backfill legacy rows from reporting year (CLARISA ToC phase UUIDs)
UPDATE toc_work_packages
SET phase = '99134294-d7a1-4966-a63e-227c9e29b9fb'
WHERE year = 2025 AND phase IS NULL;

UPDATE toc_work_packages
SET phase = '7baf200a-c958-4ded-9894-6557a94cae18'
WHERE year = 2026 AND phase IS NULL;

-- 4) Verify
SELECT year, phase, COUNT(*) AS cnt
FROM toc_work_packages
GROUP BY year, phase
ORDER BY year, phase;
