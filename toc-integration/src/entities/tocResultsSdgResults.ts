import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";

@Entity("toc_results_sdg_results")
export class TocResultsSdgResults {
  @PrimaryGeneratedColumn({
    type: "bigint",
  })
  toc_results_sdg_results_id: number;

  @Column()
  toc_results_id: number;

  @Column()
  toc_sdg_results_id: number;

  @Column()
  is_active: number;

  @Column()
  toc_sdg_results_id_toc: string;

  @Column()
  toc_results_id_toc: string;
}
