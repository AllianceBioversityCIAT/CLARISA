import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_result_indicator_target")
export class TocResultIndicatorTarget {
  @PrimaryGeneratedColumn({ name: "toc_indicator_target_id" })
  toc_indicator_target_id: number;

  @Column({ name: "toc_result_indicator_id", nullable: true, length: 500 })
  toc_result_indicator_id: string | null;

  @Column({ nullable: true, length: 1000 })
  target_value: string | null;

  @Column({ nullable: true, length: 1000 })
  target_date: string | null;

  @Column()
  number_target: number;

  @Column()
  id_indicator: number;

  @Column({ nullable: true })
  project_id: number | null;

  @Column({ nullable: true })
  center_id: number | null;
}
