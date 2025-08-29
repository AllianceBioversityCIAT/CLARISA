import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_results")
export class TocResults {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  toc_result_id: string;

  @Column()
  relation_id: string;

  @Column()
  result_type: number;

  @Column()
  result_title: string;

  @Column()
  result_description: string;

  @Column()
  outcome_type: string;

  @Column()
  phase: string;

  @Column()
  is_global: boolean;

  @Column()
  is_active: boolean;

  @Column()
  work_packages_id: number;

  @Column()
  id_toc_initiative: string;

  @Column()
  version_id: string;

  @Column({ name: "wp_id", type: "varchar", length: 100, nullable: true })
  wp_id: string | null;

  @Column({ name: "category", type: "varchar", length: 50, nullable: true })
  category: string | null;

  @Column({
    name: "related_node_id",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  related_node_id: string | null;
}
