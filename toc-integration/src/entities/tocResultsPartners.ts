import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_result_partners")
export class TocResultPartners {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  toc_result_id_toc: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  toc_id: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  name: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  acronym: string | null;

  @Column({ type: "int", nullable: true })
  code: number | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  website_link: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  added: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  add_source: string | null;
}
