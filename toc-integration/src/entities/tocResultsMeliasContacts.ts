import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("toc_results_melias_contacts")
export class TocResultsMeliasContacts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "melia_id", type: "varchar", length: 100 })
  melia_id: string;

  @Column({ name: "contact_id", type: "varchar", length: 100 })
  contact_id: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  first_name: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  last_name: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  email: string | null;

  @Column({ name: "related_node_id", type: "varchar", length: 100, nullable: true })
  related_node_id: string | null;

  @Column({ type: "boolean", default: false })
  main: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  creation_date: string | null;
}
