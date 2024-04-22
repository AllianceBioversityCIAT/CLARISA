import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_output_outcome_relations")
export class TocOutputOutcomeRelation {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  id_toc_initiative: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  is_active: boolean;
}
