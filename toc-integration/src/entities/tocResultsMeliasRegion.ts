import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_results_melias_region")
export class TocResultsMeliasRegion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "melia_id", type: "varchar", length: 100 })
  melia_id: string;

  @Column({ name: "toc_id", type: "varchar", length: 100, nullable: true })
  toc_id: string | null;

  @Column({ name: "um49_code", type: "int", nullable: true })
  um49_code: number | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  name: string | null;

  @Column({ name: "region_id", type: "varchar", length: 100, nullable: true })
  region_id: string | null;
}
