import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_results_melias_country")
export class TocResultsMeliasCountry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "melia_id", type: "varchar", length: 100 })
  melia_id: string;

  @Column({ name: "toc_id", type: "varchar", length: 100, nullable: true })
  toc_id: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  name: string | null;

  @Column({ type: "int", nullable: true })
  code: number | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  country_name: string | null;
}
