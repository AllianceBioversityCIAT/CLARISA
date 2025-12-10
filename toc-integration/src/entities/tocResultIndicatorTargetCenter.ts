import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TocResultIndicatorTarget } from "./tocIndicatorTarget";

@Entity("toc_result_indicator_target_center")
export class TocResultIndicatorTargetCenter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  toc_indicator_target_id: number;

  @Column()
  center_id: number;

  @ManyToOne(
    () => TocResultIndicatorTarget,
    (target) => target.toc_indicator_target_id,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({
    name: "toc_indicator_target_id",
    referencedColumnName: "toc_indicator_target_id",
  })
  target: TocResultIndicatorTarget;
}
