import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";

@Entity("toc_result_indicator_target")
export class TocResultIndicatorTarget {
  @PrimaryGeneratedColumn()
  toc_result_indicator_id: string;
  @Column()
  target_value: number;
  @Column()
  target_date: string;
  @Column()
  number_target: number;
  @Column()
  id_indicator: number;
}
