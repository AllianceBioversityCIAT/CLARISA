import { ValidatorTypes } from "../validators/validatorType";
import { ErrorValidators } from "../validators/errorsValidators";
import { TocImpactAreaResultsDto } from "../dto/tocImpactAreaResults";
import { TocImpactAreaResultsGlobalTargetsDto } from "../dto/tocImpactAreaResultsGlobalTargets";
import { TocImpactAreaResultsImpactAreaIndicatorsDto } from "../dto/tocImpactAreaResultsImpactAreaIndicators";
import { TocImpactAreaResultsSdgResultsDto } from "../dto/tocImpactAreaResultsSdgResults";
import { Database } from "../database/db";
import { TocImpactAreaResults } from "../entities/tocImpactAreaResults";
import { TocImpactAreaResultsGlobalTargets } from "../entities/tocImpactAreaResultsGlobalTargets";
import { TocImpactAreaResultsImpactAreaIndicators } from "../entities/tocImpactAreaResultsImpactAreaIndicators";
import { TocImpactAreaResultsSdgResults } from "../entities/tocImpactAreaResultsSdgResults";
import { DataSource } from "typeorm";

export class TocResultImpactAreaServices {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public database = new Database();

  async saveImpactAreaTocResult(
    impactArea: any,
    initiative_id: any,
    sdgResults: any,
    phase
  ) {
    try {
      console.info({ message: "Saving impact area" });
      const dataSource: DataSource = await Database.getDataSource();
      let impactAreaRepo = dataSource.getRepository(TocImpactAreaResults);
      let listImpactAreaResults = [];
      let listGlobalTargets = [];
      let listImpactAreaIndicators = [];
      let listSdgResults = [];

      if (this.validatorType.validatorIsArray(impactArea)) {
        for (let impactAreaIndex of impactArea) {
          if (
            this.validatorType.existPropertyInObjectMul(impactAreaIndex, [
              "toc_result_id",
              "impact_area_id",
              "outcome_statement",
              "global_targets",
              "impact_indicators",
              "sdgs",
            ])
          ) {
            const impactAreadto = new TocImpactAreaResultsDto();
            impactAreadto.impact_area_id =
              typeof impactAreaIndex.impact_area_id == "number"
                ? impactAreaIndex.impact_area_id
                : null;

            impactAreadto.toc_result_id =
              typeof impactAreaIndex.toc_result_id == "string"
                ? impactAreaIndex.toc_result_id
                : null;

            impactAreadto.outcome_statement =
              typeof impactAreaIndex.outcome_statement == "string"
                ? impactAreaIndex.outcome_statement
                : null;

            impactAreadto.id_toc_initiative = initiative_id;

            impactAreadto.is_active = true;

            impactAreadto.phase = phase;

            const existingRecord = await impactAreaRepo.findOne({
              where: {
                toc_result_id: impactAreadto.toc_result_id,
                phase: impactAreadto.phase,
              },
            });
            if (existingRecord) {
              await impactAreaRepo.update(
                {
                  toc_result_id: impactAreadto.toc_result_id,
                  phase: impactAreadto.phase,
                },
                impactAreadto
              );
            } else {
              await impactAreaRepo.insert(impactAreadto);
            }
            const existingRecordSaveOrUpdate = await impactAreaRepo.findOne({
              where: {
                toc_result_id: impactAreadto.toc_result_id,
                phase: impactAreadto.phase,
              },
            });

            listImpactAreaResults.push(existingRecordSaveOrUpdate);
            listGlobalTargets = listGlobalTargets.concat(
              await this.saveGlobalTargetsTocResult(
                impactAreaIndex.global_targets,
                impactAreaIndex.toc_result_id,
                existingRecordSaveOrUpdate
              )
            );
            listImpactAreaIndicators = listImpactAreaIndicators.concat(
              await this.saveImpactAreaIndicatorsTocResult(
                impactAreaIndex.impact_indicators,
                impactAreaIndex.toc_result_id,
                existingRecordSaveOrUpdate
              )
            );
            if (impactAreaIndex.sdgs[0].length > 0) {
              listSdgResults = listSdgResults.concat(
                await this.saveImpactAreaSdgResultsTocResult(
                  impactAreaIndex.sdgs[0],
                  impactAreaIndex.toc_result_id,
                  sdgResults,
                  existingRecordSaveOrUpdate
                )
              );
            }
          }
        }
      }
      return {
        listImpactAreaResults: listImpactAreaResults,
        globalTargets: listGlobalTargets,
        impactAreaIndicators: listImpactAreaIndicators,
        ImpactAreaSdgResult: listSdgResults,
      };
    } catch (error) {
      console.error({ error, message: "Error saving impact area" });
      throw error;
    }
  }

  async saveGlobalTargetsTocResult(
    globalTargets: any,
    impactAreaResults: any,
    impactAre
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      let impactAreaRepo = dataSource.getRepository(
        TocImpactAreaResultsGlobalTargets
      );
      let listValidGlobalTarget = [];

      if (this.validatorType.validatorIsArray(globalTargets)) {
        for (let global of globalTargets) {
          if (
            this.validatorType.existPropertyInObjectMul(global, [
              "global_target_id",
            ])
          ) {
            const relationGlobalTarget =
              new TocImpactAreaResultsGlobalTargetsDto();
            relationGlobalTarget.toc_impact_area_results_id_toc =
              impactAreaResults;

            relationGlobalTarget.global_targets_id =
              typeof global.global_target_id == "number"
                ? global.global_target_id
                : null;
            relationGlobalTarget.is_active = true;
            relationGlobalTarget.toc_impact_area_results_id = impactAre.id;
            const existingRecordSdgTarget = await impactAreaRepo.findOne({
              where: {
                toc_impact_area_results_id:
                  relationGlobalTarget.toc_impact_area_results_id,
                toc_impact_area_results_id_toc:
                  relationGlobalTarget.toc_impact_area_results_id_toc,
                global_targets_id: relationGlobalTarget.global_targets_id,
              },
            });
            if (!existingRecordSdgTarget) {
              await impactAreaRepo.insert(relationGlobalTarget);
            }
            listValidGlobalTarget.push(relationGlobalTarget);
          }
        }
      }
      return listValidGlobalTarget;
    } catch (error) {
      throw error;
    }
  }

  async saveImpactAreaIndicatorsTocResult(
    impactAreaIndicators: any,
    impactAreaResults: any,
    impactArea
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      let impactAreaRepo = dataSource.getRepository(
        TocImpactAreaResultsImpactAreaIndicators
      );
      let listValidImpactAreaIndicators = [];
      if (this.validatorType.validatorIsArray(impactAreaIndicators)) {
        for (let impactIndicator of impactAreaIndicators) {
          if (
            this.validatorType.existPropertyInObjectMul(impactIndicator, [
              "impact_indicator_id",
            ])
          ) {
            const relationImpactIndicator =
              new TocImpactAreaResultsImpactAreaIndicatorsDto();
            relationImpactIndicator.toc_impact_area_results_id_toc =
              impactAreaResults;

            relationImpactIndicator.impact_areas_indicators_id =
              typeof impactIndicator.impact_indicator_id == "number"
                ? impactIndicator.impact_indicator_id
                : null;
            relationImpactIndicator.is_active = true;
            relationImpactIndicator.toc_impact_area_results_id = impactArea.id;
            const existingRecordSdgTarget = await impactAreaRepo.findOne({
              where: {
                toc_impact_area_results_id:
                  relationImpactIndicator.toc_impact_area_results_id,
                toc_impact_area_results_id_toc:
                  relationImpactIndicator.toc_impact_area_results_id_toc,
                impact_areas_indicators_id:
                  relationImpactIndicator.impact_areas_indicators_id,
              },
            });
            if (!existingRecordSdgTarget) {
              await impactAreaRepo.insert(relationImpactIndicator);
            }

            listValidImpactAreaIndicators.push(relationImpactIndicator);
          }
        }
      }
      return listValidImpactAreaIndicators;
    } catch (error) {
      throw error;
    }
  }

  async saveImpactAreaSdgResultsTocResult(
    sdgResults: any,
    impactAreaResults: any,
    sdgResultsSave: any,
    impactArea
  ): Promise<any[]> {
    try {
      const listSdgImpact: any[] = [];
      const dataSource: DataSource = await Database.getDataSource();
      let impactAreaRepo = dataSource.getRepository(
        TocImpactAreaResultsSdgResults
      );
      if (this.validatorType.validatorIsArray(sdgResults)) {
        for (const sdg of sdgResults) {
          if (
            this.validatorType.existPropertyInObjectMul(sdg, ["toc_result_id"])
          ) {
            const relationSdg = new TocImpactAreaResultsSdgResultsDto();
            relationSdg.toc_impact_area_results_id_toc = impactAreaResults;
            relationSdg.toc_sdg_results_id_toc =
              typeof sdg.toc_result_id === "string" &&
              this.validatorType.validExistId(sdgResultsSave, sdg.toc_result_id)
                ? sdg.toc_result_id
                : null;
            relationSdg.is_active = true;
            relationSdg.toc_impact_area_results_id = impactArea.id;
            relationSdg.toc_sdg_results_id = sdgResultsSave.find(
              (sdgResult) => sdgResult.toc_result_id === sdg.toc_result_id
            ).id;
            const existingRecordSdgTarget = await impactAreaRepo.findOne({
              where: {
                toc_impact_area_results_id:
                  relationSdg.toc_impact_area_results_id,
                toc_sdg_results_id: relationSdg.toc_sdg_results_id,
              },
            });
            if (!existingRecordSdgTarget) {
              await impactAreaRepo.insert(relationSdg);
            }
            listSdgImpact.push(relationSdg);
          }
        }
      }
      return listSdgImpact;
    } catch (error) {
      throw error;
    }
  }

  async saveImpactAreaTocResultV2(
    data: any[],
    meta: { phase: string | null; original_id: string | null }
  ) {
    try {
      console.info({ message: "Saving impact area ToC results V2" });
      const dataSource: DataSource = await Database.getDataSource();
      const impactAreaRepo = dataSource.getRepository(TocImpactAreaResults);

      const listImpactAreaResults: TocImpactAreaResults[] = [];
      const listGlobalTargets: TocImpactAreaResultsGlobalTargets[] = [];
      const listImpactAreaIndicators: TocImpactAreaResultsImpactAreaIndicators[] =
        [];

      if (!this.validatorType.validatorIsArray(data)) {
        return {
          listImpactAreaResults,
          globalTargets: listGlobalTargets,
          impactAreaIndicators: listImpactAreaIndicators,
        };
      }

      const impactAreaItems = data.filter(
        (item) =>
          item &&
          (item.category === "IA" ||
            item.category === "ia" ||
            item.category === 3)
      );

      for (const item of impactAreaItems) {
        const toc_result_id =
          typeof item?.id === "string" || typeof item?.id === "number"
            ? String(item.id)
            : null;

        const impact_area_id =
          typeof item?.type?.id === "number" ? item.type.id : null;

        const outcome_statement =
          typeof item?.type?.description === "string"
            ? item.type.description
            : null;

        const impactAreadto = new TocImpactAreaResultsDto();
        impactAreadto.toc_result_id = toc_result_id;
        impactAreadto.impact_area_id = impact_area_id;
        impactAreadto.outcome_statement = outcome_statement;
        impactAreadto.phase = meta?.phase ?? null;
        impactAreadto.id_toc_initiative = meta?.original_id ?? null;
        impactAreadto.is_active = true;

        if (!impactAreadto.toc_result_id) {
          continue;
        }

        const existing = await impactAreaRepo.findOne({
          where: {
            toc_result_id: impactAreadto.toc_result_id,
            phase: impactAreadto.phase,
          },
        });

        if (existing) {
          await impactAreaRepo.update(
            {
              toc_result_id: impactAreadto.toc_result_id,
              phase: impactAreadto.phase,
            },
            impactAreadto
          );
        } else {
          await impactAreaRepo.insert(impactAreadto);
        }

        const saved = await impactAreaRepo.findOne({
          where: {
            toc_result_id: impactAreadto.toc_result_id,
            phase: impactAreadto.phase,
          },
        });

        if (!saved) continue;

        listImpactAreaResults.push(saved);

        const globalTargets = Array.isArray(item?.global_target)
          ? item.global_target
          : [];
        const savedGlobalTargets = await this.saveGlobalTargetsTocResultV2(
          globalTargets,
          item.id,
          saved
        );
        listGlobalTargets.push(...savedGlobalTargets);

        const indicators = Array.isArray(item?.indicators)
          ? item.indicators
          : [];
        const savedIndicators = await this.saveImpactAreaIndicatorsTocResultV2(
          indicators,
          item.id,
          saved
        );
        listImpactAreaIndicators.push(...savedIndicators);
      }

      return {
        listImpactAreaResults,
        globalTargets: listGlobalTargets,
        impactAreaIndicators: listImpactAreaIndicators,
      };
    } catch (error) {
      console.error({ error, message: "Error saving impact area V2" });
      throw error;
    }
  }

  private async saveGlobalTargetsTocResultV2(
    globalTargets: any[],
    itemId: string | number,
    impactAreaRow: TocImpactAreaResults
  ) {
    const dataSource: DataSource = await Database.getDataSource();
    const repo = dataSource.getRepository(TocImpactAreaResultsGlobalTargets);
    const list: TocImpactAreaResultsGlobalTargets[] = [];

    for (const gt of globalTargets) {
      const global_targets_id =
        typeof gt?.targetId === "number" ? gt.targetId : null;
      if (!global_targets_id) continue;

      const dto = new TocImpactAreaResultsGlobalTargetsDto();
      dto.toc_impact_area_results_id_toc =
        typeof itemId === "string" || typeof itemId === "number"
          ? String(itemId)
          : null;
      dto.global_targets_id = global_targets_id;
      dto.is_active = true;
      dto.toc_impact_area_results_id = impactAreaRow.id;

      const exists = await repo.findOne({
        where: {
          toc_impact_area_results_id: dto.toc_impact_area_results_id,
          toc_impact_area_results_id_toc: dto.toc_impact_area_results_id_toc,
          global_targets_id: dto.global_targets_id,
        },
      });
      if (!exists) {
        await repo.insert(dto);
      }

      list.push(dto);
    }

    return list;
  }

  private async saveImpactAreaIndicatorsTocResultV2(
    indicators: any[],
    itemId: string | number,
    impactAreaRow: TocImpactAreaResults
  ) {
    const dataSource: DataSource = await Database.getDataSource();
    const repo = dataSource.getRepository(
      TocImpactAreaResultsImpactAreaIndicators
    );
    const list: TocImpactAreaResultsImpactAreaIndicators[] = [];

    for (const ind of indicators) {
      const impact_areas_indicators_id =
        typeof ind?.indicatorId === "number" ? ind.indicatorId : null;
      if (!impact_areas_indicators_id) continue;

      const dto = new TocImpactAreaResultsImpactAreaIndicatorsDto();
      dto.toc_impact_area_results_id_toc =
        typeof itemId === "string" || typeof itemId === "number"
          ? String(itemId)
          : null;
      dto.impact_areas_indicators_id = impact_areas_indicators_id;
      dto.is_active = true;
      dto.toc_impact_area_results_id = impactAreaRow.id;

      const exists = await repo.findOne({
        where: {
          toc_impact_area_results_id: dto.toc_impact_area_results_id,
          toc_impact_area_results_id_toc: dto.toc_impact_area_results_id_toc,
          impact_areas_indicators_id: dto.impact_areas_indicators_id,
        },
      });
      if (!exists) {
        await repo.insert(dto);
      }

      list.push(dto);
    }

    return list;
  }
}
