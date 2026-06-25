-- Add direct FK-style link to toc_results.id (fixes reporting join by tr.id)
-- and phase to avoid cross-phase overwrites on same related_node_id

ALTER TABLE toc_result_synergy_programs
  ADD COLUMN toc_results_id INT NULL AFTER toc_result_id_toc,
  ADD COLUMN phase VARCHAR(100) NULL AFTER toc_results_id;

CREATE INDEX idx_toc_result_synergy_programs_toc_results_id
  ON toc_result_synergy_programs (toc_results_id);

CREATE INDEX idx_toc_result_synergy_programs_phase
  ON toc_result_synergy_programs (phase);

-- Optional backfill if rows already exist with matching related_node_id
UPDATE toc_result_synergy_programs trsp
INNER JOIN toc_results tr
  ON tr.related_node_id = trsp.toc_result_id_toc
SET
  trsp.toc_results_id = tr.id,
  trsp.phase = tr.phase
WHERE trsp.toc_results_id IS NULL;
