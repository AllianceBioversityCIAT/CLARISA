import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_results_indicators")
export class TocResultsIndicators {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  toc_result_indicator_id: string;

  @Column()
  toc_results_id: number;

  @Column({ type: "text", nullable: true })
  indicator_description: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  unit_messurament: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  type_value: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  baseline_value: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  baseline_date: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  target_value: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  target_date: string;

  @Column({ type: "text", nullable: true })
  data_colletion_source: string;

  @Column({ type: "text", nullable: true })
  data_collection_method: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  frequency_data_collection: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  location: string;

  @Column()
  is_active: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  toc_result_id_toc: string;

  @Column()
  main: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  create_date: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  type_name: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  related_node_id: string;

  @Column({ type: "text", nullable: true })
  measure_of_success_moderate: string;

  @Column({ type: "text", nullable: true })
  measure_of_success_minimum: string;

  @Column({ type: "text", nullable: true })
  measure_of_success_maximum: string;
}
