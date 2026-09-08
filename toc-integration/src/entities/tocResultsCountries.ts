import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

/**
 * Result-level countries (ToC v3 `data[].country[]` =
 * `{ code, name, isoAlpha2, isoAlpha3 }`). Linked to the phase-specific
 * `toc_results.id`. See docs/sql/toc_results_countries-create.sql.
 */
@Entity("toc_results_countries")
export class TocResultsCountries {
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

  @Column({ name: "country_code", type: "int", nullable: true })
  country_code: number | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  name: string | null;

  @Column({ name: "iso_alpha2", type: "char", length: 2, nullable: true })
  iso_alpha2: string | null;

  @Column({ name: "iso_alpha3", type: "char", length: 3, nullable: true })
  iso_alpha3: string | null;

  @Column({ name: "is_active", type: "tinyint", width: 1, default: 1 })
  is_active: boolean;
}
