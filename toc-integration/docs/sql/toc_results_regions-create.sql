-- toc_results_regions: result-level regions from the ToC v3 payload (data[].region[] = { um49Code, name })
-- Linked to toc_results.id (phase-specific) so the same ToC node in Phase 2025 and Phase 2026 does not collide.
-- Mirrors toc_result_indicator_region / toc_results_melias_region. Run BEFORE deploying lote 1.

CREATE TABLE IF NOT EXISTS toc_results_regions (
  id INT NOT NULL AUTO_INCREMENT,
  toc_results_id INT NOT NULL,
  toc_result_id_toc VARCHAR(100) NULL,
  um49_code INT NULL,
  name VARCHAR(150) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_toc_results_regions_toc_results_id (toc_results_id),
  INDEX idx_toc_results_regions_toc_result_id_toc (toc_result_id_toc)
);

-- Verify
SHOW CREATE TABLE toc_results_regions;
