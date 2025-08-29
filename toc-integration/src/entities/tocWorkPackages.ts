import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity("toc_work_packages")
export class TocWorkPackages {
  @PrimaryColumn({ type: "varchar", length: 100 })
  id: string;

  @Index()
  @Column({ name: "toc_id", type: "varchar", length: 100, nullable: true })
  toc_id: string | null;

  @Column({ name: "acronym", type: "varchar", length: 50, nullable: true })
  acronym: string | null;

  @Column({ name: "source", type: "varchar", length: 50, nullable: true })
  source: string | null;

  @Index()
  @Column({
    name: "wp_official_code",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  wp_official_code: string | null;

  @Column({ name: "name", type: "varchar", length: 500, nullable: true })
  name: string | null;

  @Column({ name: "wp_type", type: "varchar", length: 50, nullable: true })
  wp_type: string | null;

  @Index()
  @Column({ name: "initiativeId", type: "varchar", length: 50, nullable: true })
  initiativeId: string | null;
}
