-- Widen text columns on toc_results_indicators (Phase 2026 sync may exceed VARCHAR limits)

ALTER TABLE toc_results_indicators
  MODIFY COLUMN indicator_description TEXT NULL,
  MODIFY COLUMN data_colletion_source TEXT NULL,
  MODIFY COLUMN data_collection_method TEXT NULL,
  MODIFY COLUMN measure_of_success_moderate TEXT NULL,
  MODIFY COLUMN measure_of_success_minimum TEXT NULL,
  MODIFY COLUMN measure_of_success_maximum TEXT NULL;
