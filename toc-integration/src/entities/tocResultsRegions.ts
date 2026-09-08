import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

/**
 * Result-level regions (ToC v3 `data[].region[]` = `{ um49Code, name }`).
 * Linked to the phase-specific `toc_results.id` so 2025 and 2026 rows of the
 * same ToC node do not collide. See docs/sql/toc_results_regions-create.sql.
 */
@Entity("toc_results_regions")
export class TocResultsRegions {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "toc_results_id", type: "int" })
  toc_results_id: number;

  @Column({
    name: "toc_result_id_toc",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  toc_result_id_toc: string | null;

  @Column({ name: "um49_code", type: "int", nullable: true })
  um49_code: number | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  name: string | null;

  @Column({ name: "is_active", type: "tinyint", width: 1, default: 1 })
  is_active: boolean;
}
