import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";

@Entity("toc_result_indicator_target")
export class TocResultIndicatorTarget {
  @PrimaryGeneratedColumn()
  toc_result_indicator_id: string;

  @Column({ nullable: true })
  target_value: number | null;

  @Column({ nullable: true })
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
