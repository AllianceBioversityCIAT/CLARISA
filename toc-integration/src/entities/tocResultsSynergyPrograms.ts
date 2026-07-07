import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

@Entity("toc_result_synergy_programs")
export class TocResultSynergyPrograms {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: "varchar", length: 100 })
  toc_result_id_toc: string;

  @Index()
  @Column({ type: "int", nullable: true })
  toc_results_id: number | null;

  @Index()
  @Column({ type: "varchar", length: 100, nullable: true })
  phase: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  synergy_id: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  related_node_id: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  flow_id: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  creation_date: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  updating_date: string | null;

  @Column({ type: "boolean", nullable: true })
  main: boolean | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  flow_toc_id: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  initiative_id: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  flow_title: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  flow_type: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  wp_type: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  flow_status: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  status_reason: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  project_state: string | null;

  @Column({ type: "boolean", nullable: true })
  cgiar_project: boolean | null;

  @Column({ type: "boolean", nullable: true })
  approved: boolean | null;

  @Column({ type: "boolean", nullable: true })
  archive: boolean | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  organization_id: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  diagram_image: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  flow_creation_date: string | null;

  @Column({ type: "int", nullable: true })
  flow_version: number | null;

  @Column({ type: "boolean", nullable: true })
  flow_main: boolean | null;

  @Column({ type: "int", nullable: true })
  flow_last_update: number | null;
}
