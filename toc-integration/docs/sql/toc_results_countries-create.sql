-- toc_results_countries: result-level countries from the ToC v3 payload (data[].country[] = { code, name, isoAlpha2, isoAlpha3 })
-- Linked to toc_results.id (phase-specific) so the same ToC node in Phase 2025 and Phase 2026 does not collide.
-- Mirrors toc_result_indicator_country / toc_results_melias_country. Run BEFORE deploying lote 1.

CREATE TABLE IF NOT EXISTS toc_results_countries (
  id INT NOT NULL AUTO_INCREMENT,
  toc_results_id INT NOT NULL,
  toc_result_id_toc VARCHAR(100) NULL,
  country_code INT NULL,
  name VARCHAR(150) NULL,
  iso_alpha2 CHAR(2) NULL,
  iso_alpha3 CHAR(3) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_toc_results_countries_toc_results_id (toc_results_id),
  INDEX idx_toc_results_countries_toc_result_id_toc (toc_result_id_toc)
);

-- Verify
SHOW CREATE TABLE toc_results_countries;
