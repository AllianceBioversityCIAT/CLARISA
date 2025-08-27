import { ValidatorTypes } from "../validators/validatorType";
import { ErrorValidators } from "../validators/errorsValidators";
import { CreateSdgResultsDto } from "../dto/tocSdgResults";
import { TocSdgResultsSdgTargetsDto } from "../dto/tocSdgResultsSdgTargets";
import { TocSdgResultsSdgIndicatorsDto } from "../dto/tocSdgResultsSdgIndicators";
import { Database } from "../database/db";
import { DataSource } from "typeorm";
import { TocSdgResults } from "../entities/tocSdgResults";
import { TocSdgResultsSdgTargets } from "../entities/tocSdgResultsSdgTargets";
import { TocSdgResultsSdgIndicators } from "../entities/tocSdgResultsSdgIndicators";

export class TocSdgsServices {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public database = new Database();

  async createTocSdgResults(sdgResultToc, initiative_id, phase) {
    try {
      console.info({ message: "Saving sdg results" });
      const dataSource: DataSource = await Database.getDataSource();
      let sdgRepo = dataSource.getRepository(TocSdgResults);
      let listValidSdgResults = [];
      let listSdgTargets = [];
      let listIndicator = [];

      if (this.validatorType.validatorIsArray(sdgResultToc)) {
        for (let sdgResult of sdgResultToc) {
          if (
            this.validatorType.existPropertyInObjectMul(sdgResult, [
              "sdg_id",
              "toc_result_id",
              "sdg_contribution",
              "sdg_targets",
              "sdg_indicators",
            ])
          ) {
            const sdgResultT = new CreateSdgResultsDto();
            sdgResultT.sdg_id =
              typeof sdgResult.sdg_id == "number" ? sdgResult.sdg_id : null;

            sdgResultT.toc_result_id =
              typeof sdgResult.toc_result_id == "string"
                ? sdgResult.toc_result_id
                : null;

            sdgResultT.sdg_contribution =
              typeof sdgResult.sdg_contribution == "string"
                ? sdgResult.sdg_contribution
                : null;
            sdgResultT.id_toc_initiative = initiative_id;
            sdgResultT.phase = phase;
            sdgResultT.is_active = true;

            const existingRecord = await sdgRepo.findOne({
              where: {
                toc_result_id: sdgResultT.toc_result_id,
                phase: sdgResultT.phase,
              },
            });
            if (existingRecord) {
              // Update existing record
              await sdgRepo.update(
                {
                  toc_result_id: sdgResultT.toc_result_id,
                  phase: sdgResultT.phase,
                },
                sdgResultT
              );
            } else {
              // Insert new record
              await sdgRepo.insert(sdgResultT);
            }
            const existingRecordSavingOrUpdate = await sdgRepo.findOne({
              where: {
                toc_result_id: sdgResultT.toc_result_id,
                phase: sdgResultT.phase,
              },
            });
            await listValidSdgResults.push(existingRecordSavingOrUpdate);
            listSdgTargets = listSdgTargets.concat(
              await this.createTocSdgResultsSdgTargets(
                sdgResult.sdg_targets,
                sdgResult.toc_result_id,
                existingRecordSavingOrUpdate
              )
            );
            listIndicator = listIndicator.concat(
              await this.createTocSdgResultsTocSdgIndicators(
                sdgResult.sdg_indicators,
                sdgResult.toc_result_id,
                existingRecordSavingOrUpdate
              )
            );
          }
        }
      }

      return {
        sdgResults: listValidSdgResults,
        sdgTargets: listSdgTargets,
        sdgIndicators: listIndicator,
      };
    } catch (error) {
      console.error({ error, message: "Error saving sdg results" });
      throw error;
    }
  }

  async createTocSdgResultsSdgTargets(
    sdgTargetsToc,
    toc_results_id: string,
    sdg
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      let sdgRepo = dataSource.getRepository(TocSdgResults);
      let sdgRepoTarget = dataSource.getRepository(TocSdgResultsSdgTargets);

      let sdgTargets: any = [];
      if (this.validatorType.validatorIsArray(sdgTargetsToc)) {
        for (let sdgTarget of sdgTargetsToc) {
          if (
            this.validatorType.existPropertyInObjectMul(sdgTarget, [
              "sdg_target_id",
            ])
          ) {
            const relacionSdgTarget = new TocSdgResultsSdgTargetsDto();
            relacionSdgTarget.sdg_target_id =
              typeof sdgTarget.sdg_target_id == "number"
                ? sdgTarget.sdg_target_id
                : null;

            relacionSdgTarget.toc_sdg_results_id_toc = toc_results_id;

            relacionSdgTarget.is_active = true;

            relacionSdgTarget.toc_sdg_results_id = sdg.id;

            const existingRecordSdgTarget = await sdgRepoTarget.findOne({
              where: {
                toc_sdg_results_id: relacionSdgTarget.toc_sdg_results_id,
                toc_sdg_results_id_toc: toc_results_id,
                sdg_target_id: relacionSdgTarget.sdg_target_id,
              },
            });

            if (!existingRecordSdgTarget) {
              // Update existing record
              await sdgRepoTarget.insert(relacionSdgTarget);
            }

            await sdgTargets.push(relacionSdgTarget);
          }
        }
      }
      return sdgTargets;
    } catch (error) {
      throw error;
    }
  }

  async createTocSdgResultsTocSdgIndicators(
    sdgIndicatorsToc,
    toc_results_id: string,
    sdg
  ) {
    try {
      let sdgIndicatorT: any = [];
      const dataSource: DataSource = await Database.getDataSource();
      let sdgIndicatorRep = dataSource.getRepository(
        TocSdgResultsSdgIndicators
      );
      if (this.validatorType.validatorIsArray(sdgIndicatorsToc)) {
        for (let sdgIndicatorI of sdgIndicatorsToc) {
          if (
            this.validatorType.existPropertyInObjectMul(sdgIndicatorI, [
              "sdg_indicator_id",
            ])
          ) {
            const relacionSdgIndicator = new TocSdgResultsSdgIndicatorsDto();
            relacionSdgIndicator.sdg_indicator_id =
              typeof sdgIndicatorI.sdg_indicator_id == "number"
                ? sdgIndicatorI.sdg_indicator_id
                : null;
            relacionSdgIndicator.toc_sdg_results_id = sdg.id;
            relacionSdgIndicator.toc_sdg_results_id_toc = toc_results_id;
            relacionSdgIndicator.is_active = true;
            await sdgIndicatorT.push(sdgIndicatorI);
            const existingRecordSdgTarget = await sdgIndicatorRep.findOne({
              where: {
                toc_sdg_results_id: relacionSdgIndicator.toc_sdg_results_id,
                toc_sdg_results_id_toc: toc_results_id,
                sdg_indicator_id: relacionSdgIndicator.sdg_indicator_id,
              },
            });
            if (!existingRecordSdgTarget) {
              // Update existing record
              await sdgIndicatorRep.insert(relacionSdgIndicator);
            }
          }
        }
      }
      return sdgIndicatorT;
    } catch (error) {
      throw error;
    }
  }

  async createTocSdgResultsV2(
    items: any[],
    meta: { phase: string | null; original_id: string | null }
  ) {
    const dataSource: DataSource = await Database.getDataSource();
    const sdgRepo = dataSource.getRepository(TocSdgResults);

    const listValidSdgResults: TocSdgResults[] = [];
    const listSdgTargets: TocSdgResultsSdgTargets[] = [];
    const listIndicators: TocSdgResultsSdgIndicators[] = [];

    if (!this.validatorType.validatorIsArray(items)) {
      return { sdgResults: [], sdgTargets: [], sdgIndicators: [] };
    }

    const sdgItems = items.filter((it) => {
      const cat =
        typeof it?.category === "string"
          ? it.category.trim().toUpperCase()
          : "";
      return cat === "SDG";
    });

    for (const item of sdgItems) {
      const toc_result_id =
        typeof item?.id === "string" || typeof item?.id === "number"
          ? String(item.id)
          : null;
      const sdg_id_raw = item?.type?.usndCode;
      const sdg_id =
        typeof sdg_id_raw === "number"
          ? sdg_id_raw
          : Number.isFinite(Number(sdg_id_raw))
          ? Number(sdg_id_raw)
          : null;
      const sdg_contribution =
        typeof item?.type?.fullName === "string" ? item.type.fullName : null;

      if (!toc_result_id) continue;

      const dto = new CreateSdgResultsDto();
      dto.toc_result_id = toc_result_id;
      dto.sdg_id = sdg_id ?? null;
      dto.sdg_contribution = sdg_contribution;
      dto.phase = meta?.phase ?? null;
      dto.id_toc_initiative = meta?.original_id ?? null;
      dto.is_active = true;

      const existing = await sdgRepo.findOne({
        where: { toc_result_id: dto.toc_result_id, phase: dto.phase },
      });

      if (existing) {
        await sdgRepo.update(
          { toc_result_id: dto.toc_result_id, phase: dto.phase },
          dto
        );
      } else {
        await sdgRepo.insert(dto);
      }

      const saved = await sdgRepo.findOne({
        where: { toc_result_id: dto.toc_result_id, phase: dto.phase },
      });
      if (!saved) continue;

      listValidSdgResults.push(saved);

      // Targets
      const targets = Array.isArray(item?.targets) ? item.targets : [];
      const targetsSaved = await this.createTocSdgResultsSdgTargetsV2(
        targets,
        saved,
        toc_result_id
      );
      listSdgTargets.push(...targetsSaved);

      // Indicators
      const indicators = Array.isArray(item?.indicators) ? item.indicators : [];
      const indicatorsSaved = await this.createTocSdgResultsTocSdgIndicatorsV2(
        indicators,
        saved,
        toc_result_id
      );
      listIndicators.push(...indicatorsSaved);
    }

    return {
      sdgResults: listValidSdgResults,
      sdgTargets: listSdgTargets,
      sdgIndicators: listIndicators,
    };
  }

  async createTocSdgResultsSdgTargetsV2(
    targets: any[],
    sdg: TocSdgResults,
    toc_results_id_toc: string
  ) {
    const dataSource: DataSource = await Database.getDataSource();
    const sdgRepoTarget = dataSource.getRepository(TocSdgResultsSdgTargets);

    const sdgTargets: TocSdgResultsSdgTargets[] = [];
    if (!this.validatorType.validatorIsArray(targets)) return sdgTargets;

    for (const t of targets) {
      const sdg_target_id =
        typeof t?.id === "number"
          ? t.id
          : Number.isFinite(Number(t?.id))
          ? Number(t.id)
          : null;
      if (!sdg_target_id) continue;

      const relacion = new TocSdgResultsSdgTargetsDto();
      relacion.toc_sdg_results_id = sdg.id;
      relacion.toc_sdg_results_id_toc = toc_results_id_toc;
      relacion.sdg_target_id = sdg_target_id;
      relacion.is_active = true;

      const exists = await sdgRepoTarget.findOne({
        where: {
          toc_sdg_results_id: relacion.toc_sdg_results_id,
          toc_sdg_results_id_toc: relacion.toc_sdg_results_id_toc,
          sdg_target_id: relacion.sdg_target_id,
        },
      });
      if (!exists) {
        await sdgRepoTarget.insert(relacion);
      }
      sdgTargets.push(relacion as any);
    }
    return sdgTargets;
  }

  async createTocSdgResultsTocSdgIndicatorsV2(
    indicators: any[],
    sdg: TocSdgResults,
    toc_results_id_toc: string
  ) {
    const dataSource: DataSource = await Database.getDataSource();
    const sdgIndicatorRep = dataSource.getRepository(
      TocSdgResultsSdgIndicators
    );

    const result: TocSdgResultsSdgIndicators[] = [];
    if (!this.validatorType.validatorIsArray(indicators)) return result;

    for (const ind of indicators) {
      const sdg_indicator_id =
        typeof ind?.target_id === "number"
          ? ind.target_id
          : Number.isFinite(Number(ind?.target_id))
          ? Number(ind.target_id)
          : null;
      if (!sdg_indicator_id) continue;

      const relacion = new TocSdgResultsSdgIndicatorsDto();
      relacion.toc_sdg_results_id = sdg.id;
      relacion.toc_sdg_results_id_toc = toc_results_id_toc;
      relacion.sdg_indicator_id = sdg_indicator_id;
      relacion.is_active = true;

      const exists = await sdgIndicatorRep.findOne({
        where: {
          toc_sdg_results_id: relacion.toc_sdg_results_id,
          toc_sdg_results_id_toc: relacion.toc_sdg_results_id_toc,
          sdg_indicator_id: relacion.sdg_indicator_id,
        },
      });
      if (!exists) {
        await sdgIndicatorRep.insert(relacion);
      }
      result.push(relacion as any);
    }
    return result;
  }
}
