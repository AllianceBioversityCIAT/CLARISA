import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_results_melias")
export class TocResultsMelias {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "melia_id", type: "varchar", length: 100 })
  melia_id: string;

  @Column({ name: "toc_result_id", type: "int" })
  toc_result_id: number;

  @Column({ name: "toc_result_id_toc", type: "varchar", length: 100, nullable: true })
  toc_result_id_toc: string | null;

  @Column({ type: "boolean", default: false })
  main: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  methods_and_design_approaches: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  updating_date: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  flow: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  flow_id: string | null;

  @Column({ type: "varchar", length: 500 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  geographic_scope: string | null;

  @Column({ type: "text", nullable: true })
  specification: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  creation_date: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  end_date: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  center_toc_id: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  center_acronym: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  center_name: string | null;

  @Column({ type: "int", nullable: true })
  center_code: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  melia_type_id: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  melia_type_title: string | null;

  @Column({ type: "text", nullable: true })
  melia_type_description: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  melia_type_color: string | null;

  @Column({ type: "boolean", default: false })
  melia_type_main: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  melia_type_creation_date: string | null;

  @Column({ type: "int", nullable: true })
  reported_indicators_low: number | null;

  @Column({ type: "int", nullable: true })
  reported_indicators_high: number | null;
}
