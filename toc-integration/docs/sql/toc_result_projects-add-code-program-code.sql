-- toc_result_projects: store the project business code (e.g. "L-ACI032") and
-- the program it contributes to (e.g. "SP03"), both sent in result.projects[].
-- Run BEFORE deploying the code that writes toc_result_projects.code / program_code.

-- 0) Pre-check (MySQL has no ADD COLUMN IF NOT EXISTS): expect 0 rows
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'toc_result_projects'
  AND COLUMN_NAME IN ('code', 'program_code');

-- 1) Add the columns (NULL until the next sync rewrites each result's projects)
ALTER TABLE toc_result_projects
  ADD COLUMN code VARCHAR(50) NULL AFTER project_id,
  ADD COLUMN program_code VARCHAR(50) NULL AFTER code;

-- 2) Verify
SELECT program_code, COUNT(*) AS cnt, SUM(code IS NULL) AS without_code
FROM toc_result_projects
GROUP BY program_code
ORDER BY cnt DESC;
