import { DataSource } from "typeorm";
import { Database } from "../database/db";
import { ValidatorTypes } from "../validators/validatorType";
import { TocWorkPackages } from "../entities/tocWorkPackages";

export class ToCWorkPackagesService {
  private validator = new ValidatorTypes();

  async saveWorkPackagesV2(data: any[]) {
    console.info({ message: "Creating ToC Work Packages V2" });
    const dataSource: DataSource = await Database.getDataSource();
    const repo = dataSource.getRepository(TocWorkPackages);
    const workPackages: TocWorkPackages[] = [];

    if (!this.validator.validatorIsArray(data)) return { workPackages };

    const items = data.filter(
      (item) => item && (item.category === "WP" || item.category === "wp")
    );

    for (const item of items) {
      const ost = item?.ost_wp || {};
      console.info({
        message: "Processing work package",
        acronym: ost?.acronym,
      });

      const rawId =
        typeof item?.id === "string" || typeof item?.id === "number"
          ? String(item.id)
          : undefined;
      const tocId =
        typeof ost?.toc_id === "string" || typeof ost?.toc_id === "number"
          ? String(ost.toc_id)
          : null;
      const officialCode =
        typeof ost?.wp_official_code === "string" ? ost.wp_official_code : null;

      if (!officialCode || !tocId) continue;

      const record: Partial<TocWorkPackages> = {
        id: rawId,
        toc_id: tocId,
        acronym: typeof ost?.acronym === "string" ? ost.acronym : null,
        source: typeof ost?.source === "string" ? ost.source : null,
        wp_official_code: officialCode,
        name: typeof ost?.name === "string" ? ost.name : null,
        wp_type:
          typeof item?.wp_type === "string" || typeof item?.wp_type === "number"
            ? String(item.wp_type)
            : null,
        initiativeId:
          typeof ost?.initiativeId === "string" ||
          typeof ost?.initiativeId === "number"
            ? String(ost.initiativeId)
            : null,
      };

      const where = { wp_official_code: officialCode, toc_id: tocId };
      const existing = await repo.findOne({ where });

      if (existing) {
        record.id = existing.id;
        await repo.update(where, record);
      } else {
        if (!record.id) {
          record.id = `${tocId}-${officialCode}`;
        }
        await repo.insert(record as TocWorkPackages);
      }

      const fresh = await repo.findOne({ where });
      if (fresh) workPackages.push(fresh);
    }

    return { workPackages };
  }
}
