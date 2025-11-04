import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_result_projects")
export class TocResultProject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  toc_result_id_toc: string;

  @Column({ type: "varchar", length: 100 })
  project_id: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  name: string | null;

  @Column({ type: "text", nullable: true })
  project_summary: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  creation_date: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  start_date: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  end_date: string | null;
}
