import { DataSource } from "typeorm";
import { Database } from "../database/db";
import { ValidatorTypes } from "../validators/validatorType";
import { ErrorValidators } from "../validators/errorsValidators";
import { TocResultsDto } from "../dto/tocResults";
import { TocResultsActionAreaResultsDto } from "../dto/tocResultsActionAreaResults";
import { TocResultsImpactAreaResultsDto } from "../dto/tocResultsImpactAreaResults";
import { TocResultsSdgResultsDto } from "../dto/tocResultsSdgResults";
import { TocResultsIndicatorsDto } from "../dto/tocResultsIndicators";
import { TocResultsRegionsDto } from "../dto/tocResultsRegions";
import { TocResultsCountriesDto } from "../dto/tocResultsCountries";
import { TocResults } from "../entities/tocResults";
import { TocResultsActionAreaResults } from "../entities/tocResultsActionAreaResults";
import { TocResultsImpactAreaResults } from "../entities/tocResultsImpactAreaResults";
import { TocResultsSdgResults } from "../entities/tocResultsSdgResults";
import { TocResultsIndicators } from "../entities/tocResultsIndicators";
import { TocResultIndicatorCountry } from "../entities/tocResultsIndicatorCountry";
import { TocResultIndicatorRegion } from "../entities/tocResultIndicatorRegion";
import { TocResultIndicatorRegionDto } from "../dto/tocIndicatorRegion";
import { TocResultIndicatorCountryDto } from "../dto/tocIndicatorCountry";
import { TocResultIndicatorTargetDTO } from "../dto/tocIndicatorTarget";
import { TocResultIndicatorTarget } from "../entities/tocIndicatorTarget";
import { TocResultProject } from "../entities/tocResultsProjects";
import { TocResultPartners } from "../entities/tocResultsPartners";
import { TocSdgResults } from "../entities/tocSdgResults";

export class TocResultServices {
  public validatorType = new ValidatorTypes();
  public errorMessage = new ErrorValidators();
  public database = new Database();

  async saveTocResults(
    toc_results: any,
    sdg_results: any,
    action_results: any,
    impact_results: any,
    id_toc_init: string,
    phase,
    version_id
  ) {
    try {
      console.info({ message: "Saving toc results" });
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(TocResults);
      let listResultsToc = [];
      let listResultsSdg = [];
      let listResultsAction = [];
      let listResultsImpact = [];
      let listResultsIndicator = [];
      let listResultsRegion = [];
      let listResultsCountry = [];
      let listContryIndicator = [];
      let listRegionIndicator = [];

      if (this.validatorType.validatorIsArray(toc_results)) {
        tocResultRepo.update(
          { id_toc_initiative: id_toc_init, phase },
          { is_active: false }
        );

        for (let tocResultItem of toc_results) {
          if (
            this.validatorType.existPropertyInObjectMul(tocResultItem, [
              "toc_result_id",
              "id",
              "result_type",
              "wp_id",
              "result_title",
              "result_description",
              "outcome_type",
              "indicators",
              "action_areas",
              "impact_areas",
              "sdgs",
              "geo_scope",
            ])
          ) {
            let tocResult = new TocResultsDto();

            tocResult.toc_result_id =
              typeof tocResultItem.toc_result_id == "string"
                ? tocResultItem.toc_result_id
                : null;

            tocResult.relation_id =
              typeof tocResultItem.id == "string" ? tocResultItem.id : null;

            tocResult.result_type =
              typeof tocResultItem.result_type == "number"
                ? tocResultItem.result_type
                : null;

            tocResult.work_packages_id =
              typeof tocResultItem.wp_id == "number"
                ? tocResultItem.wp_id
                : null;

            tocResult.result_title =
              typeof tocResultItem.result_title == "string"
                ? tocResultItem.result_title
                : null;

            tocResult.result_description =
              typeof tocResultItem.result_description == "string"
                ? tocResultItem.result_description
                : null;

            tocResult.outcome_type =
              typeof tocResultItem.outcome_type == "string"
                ? tocResultItem.outcome_type
                : null;

            tocResult.is_global = true;
            tocResult.is_active = true;
            tocResult.id_toc_initiative = id_toc_init;
            tocResult.phase = phase;
            tocResult.version_id = version_id;

            const existingRecord = await tocResultRepo.findOne({
              where: {
                toc_result_id: tocResult.toc_result_id,
                phase: tocResult.phase,
              },
            });

            if (existingRecord) {
              await tocResultRepo.update(
                {
                  toc_result_id: tocResult.toc_result_id,
                  phase: tocResult.phase,
                },
                tocResult
              );
            } else {
              await tocResultRepo.insert(tocResult);
            }

            const existingRecordSaveOrUpdate = await tocResultRepo.findOne({
              where: {
                toc_result_id: tocResult.toc_result_id,
                phase: tocResult.phase,
              },
            });

            listResultsToc.push(existingRecordSaveOrUpdate);
            const auxIndicatorInformation = await this.tocResultsIndicator(
              tocResultItem.toc_result_id,
              tocResultItem.indicators,
              existingRecordSaveOrUpdate
            );
            listResultsIndicator = listResultsIndicator.concat(
              auxIndicatorInformation.listResultsIndicator
            );
            listContryIndicator = listContryIndicator.concat(
              auxIndicatorInformation.listCountries
            );
            listRegionIndicator = listRegionIndicator.concat(
              auxIndicatorInformation.listRegions
            );
            listResultsAction = listResultsAction.concat(
              await this.saveTocResultsAction(
                tocResultItem.toc_result_id,
                tocResultItem.action_areas,
                action_results,
                existingRecordSaveOrUpdate
              )
            );
            listResultsImpact = listResultsImpact.concat(
              await this.saveTocResultsImpact(
                tocResultItem.toc_result_id,
                tocResultItem.impact_areas,
                impact_results,
                existingRecordSaveOrUpdate
              )
            );
            listResultsSdg = listResultsSdg.concat(
              await this.saveTocResultsSdg(
                tocResultItem.toc_result_id,
                tocResultItem.sdgs,
                sdg_results,
                existingRecordSaveOrUpdate
              )
            );
            const auxGeoScope = await this.saveTocGeoScope(
              tocResultItem.toc_result_id,
              tocResultItem.geo_scope
            );
            listResultsCountry = listResultsCountry.concat(
              auxGeoScope.listCountries
            );
            listResultsRegion = listResultsRegion.concat(
              auxGeoScope.listRegios
            );
          }
        }
      }

      return {
        listResultsToc: listResultsToc,
        indicatorResults: listResultsIndicator,
        impact_area_toc_results: listResultsImpact,
        action_area_toc_results: listResultsAction,
        sdg_results: listResultsSdg,
        countries: listResultsCountry,
        regions: listResultsRegion,
        indicatorCountries: listContryIndicator,
        indicatorRegions: listRegionIndicator,
      };
    } catch (error) {
      throw new Error(`Error saving toc results: ${error}`);
    }
  }

  async tocResultsIndicator(id_result: string, indicators: any, tocresults) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(TocResultsIndicators);

      let listResultsIndicator = [];
      let listRegions = [];
      let listCountries = [];

      if (this.validatorType.validatorIsArray(indicators)) {
        tocResultRepo.update(
          { toc_results_id: tocresults.id },
          { is_active: false }
        );
        for (let indicatorItem of indicators) {
          if (
            this.validatorType.existPropertyInObjectMul(indicatorItem, ["id"])
          ) {
            let indicator = new TocResultsIndicatorsDto();
            indicator.toc_result_indicator_id =
              typeof indicatorItem.id == "string" ? indicatorItem.id : null;
            indicator.toc_results_id = tocresults.id;
            indicator.indicator_description =
              typeof indicatorItem.description == "string"
                ? indicatorItem.description
                : null;
            indicator.unit_messurament =
              typeof indicatorItem.unit_of_measurement == "string"
                ? indicatorItem.unit_of_measurement
                : null;
            indicator.baseline_value =
              typeof indicatorItem.baseline.value == "string"
                ? indicatorItem.baseline.value
                : null;
            indicator.baseline_date =
              typeof indicatorItem.baseline.date == "string"
                ? indicatorItem.baseline.date
                : null;
            indicator.data_colletion_source =
              typeof indicatorItem.data_collection_source == "string"
                ? indicatorItem.data_collection_source
                : null;
            indicator.data_collection_method =
              typeof indicatorItem.data_collection_method == "string"
                ? indicatorItem.data_collection_method
                : null;
            indicator.frequency_data_collection =
              typeof indicatorItem.data_collection_frequency == "string"
                ? indicatorItem.data_collection_frequency
                : null;
            indicator.is_active = true;
            indicator.type_value =
              typeof indicatorItem.type.value == "string"
                ? indicatorItem.type.value
                : null;
            indicator.location =
              typeof indicatorItem.location == "string"
                ? indicatorItem.location
                : null;
            indicator.toc_result_id_toc = id_result;
            indicator.main =
              typeof indicatorItem.main == "boolean"
                ? indicatorItem.main
                : null;
            indicator.create_date =
              typeof indicatorItem.creation_date == "string"
                ? indicatorItem.creation_date
                : null;
            indicator.type_name =
              typeof indicatorItem.type.name == "string"
                ? indicatorItem.type.name
                : null;
            indicator.related_node_id =
              typeof indicatorItem.related_node_id == "string"
                ? indicatorItem.related_node_id
                : indicatorItem.id;
            listResultsIndicator.push(indicator);

            const existingRecord = await tocResultRepo.findOne({
              where: {
                related_node_id: indicator.related_node_id,
                toc_result_id_toc: indicator.toc_result_id_toc,
                toc_results_id: indicator.toc_results_id,
              },
            });

            let recordTocIndicator: any;
            if (existingRecord) {
              await tocResultRepo.update(
                {
                  related_node_id: indicator.related_node_id,
                  toc_results_id: indicator.toc_results_id,
                },
                indicator
              );
              recordTocIndicator = await tocResultRepo.findOne({
                where: {
                  related_node_id: indicator.related_node_id,
                  toc_results_id: indicator.toc_results_id,
                },
              });
            } else {
              await tocResultRepo.insert(indicator);
              recordTocIndicator = await tocResultRepo.findOne({
                where: {
                  related_node_id: indicator.related_node_id,
                  toc_results_id: indicator.toc_results_id,
                },
              });
            }

            const auxIndicatorGeoScope = await this.saveIndicatorGeoScope(
              indicatorItem.id,
              { regions: indicatorItem.region, country: indicatorItem.country }
            );
            listCountries = listCountries.concat(
              auxIndicatorGeoScope.listCountries
            );
            listRegions = listRegions.concat(auxIndicatorGeoScope.listRegios);

            await this.saveIndicatorTarget(
              indicatorItem.related_node_id,
              recordTocIndicator.id,
              indicatorItem.target
            );
          }
        }
      }
      return { listResultsIndicator, listRegions, listCountries };
    } catch (error) {
      throw new Error(`Error saving toc results indicators: ${error}`);
    }
  }

  async saveTocResultsSdg(
    id_result: string,
    sdg_results: any[],
    sdg_results_save: any[],
    tocre
  ) {
    try {
      let itemSdg = [];
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(TocResultsSdgResults);

      if (this.validatorType.validatorIsArray(sdg_results)) {
        await tocResultRepo.update(
          { toc_results_id: tocre.id },
          { is_active: 0 }
        );

        for (let resultSdgItem of sdg_results) {
          if (
            this.validatorType.existPropertyInObjectMul(resultSdgItem, [
              "toc_result_id",
            ])
          ) {
            const sdgResult = new TocResultsSdgResultsDto();
            sdgResult.toc_results_id = tocre.id;

            const matchedSdgResult = sdg_results_save.find(
              (sdgResult) =>
                sdgResult.toc_result_id === resultSdgItem.toc_result_id
            );

            if (matchedSdgResult) {
              sdgResult.toc_sdg_results_id = matchedSdgResult.id;
              sdgResult.toc_results_id_toc = id_result;
              sdgResult.is_active = 1;
              sdgResult.toc_sdg_results_id_toc = resultSdgItem.toc_result_id;

              const existingRecordSdgTarget = await tocResultRepo.findOne({
                where: {
                  toc_results_id: sdgResult.toc_results_id,
                  toc_sdg_results_id: sdgResult.toc_sdg_results_id,
                },
              });

              if (!existingRecordSdgTarget) {
                await tocResultRepo.insert(sdgResult);
              } else {
                await tocResultRepo.update(
                  {
                    toc_results_id: sdgResult.toc_results_id,
                    toc_sdg_results_id: sdgResult.toc_sdg_results_id,
                  },
                  sdgResult
                );
              }
            }
          }
        }
      }
      return itemSdg;
    } catch (error) {
      throw new Error(`Error saving toc results sdg: ${error}`);
    }
  }

  async saveTocResultsAction(
    id_result: string,
    action_results: any,
    action_Area_results_save: any,
    tocres
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(
        TocResultsActionAreaResults
      );

      let actionAreaToc = [];
      if (this.validatorType.validatorIsArray(action_results)) {
        tocResultRepo.update(
          { toc_results_id: tocres.id },
          { is_active: false }
        );
        for (let resultActionItem of action_results) {
          if (
            this.validatorType.existPropertyInObjectMul(action_results, [
              "toc_result_id",
            ])
          ) {
            let actionResult = new TocResultsActionAreaResultsDto();
            actionResult.toc_results_id = tocres.id;
            actionResult.toc_action_area_results_id =
              action_Area_results_save.find(
                (actionResult) =>
                  actionResult.toc_result_id === resultActionItem.toc_result_id
              ).id;
            actionResult.toc_results_id_toc = id_result;
            actionResult.is_active = true;
            actionResult.toc_action_area_results_id_toc =
              resultActionItem.toc_result_id;
            const existingRecordActionTarget = await tocResultRepo.findOne({
              where: {
                toc_results_id: actionResult.toc_results_id,
                toc_action_area_results_id:
                  actionResult.toc_action_area_results_id,
              },
            });
            if (!existingRecordActionTarget) {
              await tocResultRepo.insert(actionResult);
            }
            actionAreaToc.push(actionResult);
          }
        }
      }

      return actionAreaToc;
    } catch (error) {
      throw new Error(`Error saving toc results action: ${error}`);
    }
  }

  async saveTocResultsImpact(
    id_result: string,
    impact_results: any,
    impact_area_results_save: any,
    tocres
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(
        TocResultsImpactAreaResults
      );

      let impactToc = [];
      if (this.validatorType.validatorIsArray(impact_results)) {
        tocResultRepo.update(
          { toc_results_id: tocres.id },
          { is_active: false }
        );
        for (let resultImpact of impact_results) {
          if (
            this.validatorType.existPropertyInObjectMul(impact_results, [
              "toc_result_id",
            ])
          ) {
            let impactAreaToc = new TocResultsImpactAreaResultsDto();
            impactAreaToc.toc_results_id = tocres.id;
            impactAreaToc.toc_impact_area_results_id =
              impact_area_results_save.find(
                (actionResult) =>
                  actionResult.toc_result_id === resultImpact.toc_result_id
              ).id;
            impactAreaToc.toc_results_id_toc = id_result;
            impactAreaToc.is_active = true;
            impactAreaToc.toc_impact_area_results_id_toc =
              resultImpact.toc_result_id;
            const existingRecordImpactTarget = await tocResultRepo.findOne({
              where: {
                toc_results_id: impactAreaToc.toc_results_id,
                toc_impact_area_results_id:
                  impactAreaToc.toc_impact_area_results_id,
              },
            });
            if (!existingRecordImpactTarget) {
              await tocResultRepo.insert(impactAreaToc);
            }
            impactToc.push(impactAreaToc);
          }
        }
      }

      return impactToc;
    } catch (error) {
      throw new Error(`Error saving toc results impact: ${error}`);
    }
  }

  async saveTocGeoScope(id_toc_Result: string, geo_scope: any) {
    try {
      let listRegios = [];
      let listCountries = [];
      if (this.validatorType.validatorIsObject(geo_scope)) {
        if (
          this.validatorType.existPropertyInObjectMul(geo_scope, [
            "regions",
            "countries",
          ])
        ) {
          if (this.validatorType.validatorIsArray(geo_scope.regions)) {
            for (let region of geo_scope.regions) {
              if (this.validatorType.existPropertyInObjectMul(region, ["id"])) {
                let geoScope = new TocResultsRegionsDto();
                geoScope.toc_result_id = id_toc_Result;
                geoScope.clarisa_regions_id =
                  typeof region.id == "string" ? region.id : null;
                listRegios.push(geoScope);
              }
            }
          }
          if (this.validatorType.validatorIsArray(geo_scope.countries)) {
            for (let country of geo_scope.countries) {
              if (
                this.validatorType.existPropertyInObjectMul(country, [
                  "country_id",
                ])
              ) {
                let geoScope = new TocResultsCountriesDto();
                geoScope.toc_result_id = id_toc_Result;
                geoScope.clarisa_countries_id =
                  typeof country.country_id == "number"
                    ? country.country_id
                    : null;
                listCountries.push(geoScope);
              }
            }
          }
        }
      }
      return { listRegios, listCountries };
    } catch (error) {
      throw new Error(`Error saving toc results geo scope: ${error}`);
    }
  }

  async saveIndicatorGeoScope(id_indicator: string, geo_scope: any) {
    try {
      let listRegios = [];
      let listCountries = [];
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(TocResultIndicatorCountry);
      const regionrepo = dataSource.getRepository(TocResultIndicatorRegion);
      if (this.validatorType.validatorIsObject(geo_scope)) {
        if (
          this.validatorType.existPropertyInObjectMul(geo_scope, [
            "regions",
            "countries",
          ])
        ) {
          if (this.validatorType.validatorIsArray(geo_scope.regions)) {
            for (let region of geo_scope.regions) {
              if (this.validatorType.existPropertyInObjectMul(region, ["id"])) {
                let geoScope = new TocResultIndicatorRegionDto();
                geoScope.toc_result_id = id_indicator;
                geoScope.clarisa_regions_id =
                  typeof region.id == "string" ? region.id : null;
                const geoScopeSave = await regionrepo.findOne({
                  where: {
                    clarisa_regions_id: geoScope.clarisa_regions_id,
                    toc_result_id: geoScope.toc_result_id,
                  },
                });
                if (!geoScopeSave) {
                  await regionrepo.save(geoScope);
                }
                listRegios.push(geoScope);
              }
            }
          }
          if (this.validatorType.validatorIsArray(geo_scope.country)) {
            for (let country of geo_scope.country) {
              if (
                this.validatorType.existPropertyInObjectMul(country, [
                  "country_id",
                ])
              ) {
                let geoScope = new TocResultIndicatorCountryDto();
                geoScope.toc_result_id = id_indicator;
                geoScope.clarisa_countries_id =
                  typeof country.country_id == "number"
                    ? country.country_id
                    : null;
                const geoScopeSave = await tocResultRepo.findOne({
                  where: {
                    clarisa_countries_id: geoScope.clarisa_countries_id,
                    toc_result_id: geoScope.toc_result_id,
                  },
                });
                if (!geoScopeSave) {
                  await regionrepo.save(geoScope);
                }
                listCountries.push(geoScope);
              }
            }
          }
        }
      }
      return { listRegios, listCountries };
    } catch (error) {
      throw new Error(`Error saving toc results geo scope: ${error}`);
    }
  }

  async saveIndicatorTarget(toc_id_indicator: string, id: number, target: any) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const tocResultRepo = dataSource.getRepository(TocResultIndicatorTarget);

      if (toc_id_indicator != null) {
        let validator = await this.validatorType.validatorIsObject(target);
        if (validator) {
          if (
            this.validatorType.existPropertyInObjectMul(target, [
              "value",
              "date",
            ])
          ) {
            let targetIndicator = new TocResultIndicatorTargetDTO();
            targetIndicator.id_indicator = id;
            targetIndicator.toc_result_indicator_id = toc_id_indicator;

            if (typeof target.value === "number" && !isNaN(target.value)) {
              targetIndicator.target_value = target.value;
            } else if (
              typeof target.value === "string" &&
              target.value.trim() !== ""
            ) {
              targetIndicator.target_value = target.value.trim();
            } else {
              targetIndicator.target_value = null;
            }

            if (typeof target.date === "string" && target.date.trim() !== "") {
              targetIndicator.target_date = target.date.trim();
            } else {
              targetIndicator.target_date = null;
            }

            targetIndicator.number_target = null;

            await tocResultRepo.delete({
              toc_result_indicator_id: toc_id_indicator,
            });
            await tocResultRepo.save(targetIndicator);
          }
        }
        if (this.validatorType.validatorIsArray(target)) {
          let targetNumber = 0;
          await tocResultRepo.delete({
            toc_result_indicator_id: toc_id_indicator,
          });
          for (let targetItem of target) {
            if (
              this.validatorType.existPropertyInObjectMul(targetItem, [
                "value",
                "date",
              ])
            ) {
              let targetIndicator = new TocResultIndicatorTargetDTO();
              targetIndicator.id_indicator = id;
              targetIndicator.toc_result_indicator_id = toc_id_indicator;

              if (
                typeof targetItem.value === "number" &&
                !isNaN(targetItem.value)
              ) {
                targetIndicator.target_value = targetItem.value;
              } else if (
                typeof targetItem.value === "string" &&
                targetItem.value.trim() !== ""
              ) {
                targetIndicator.target_value = targetItem.value.trim();
              } else {
                targetIndicator.target_value = null;
              }

              if (
                typeof targetItem.date === "string" &&
                targetItem.date.trim() !== ""
              ) {
                targetIndicator.target_date = targetItem.date.trim();
              } else {
                targetIndicator.target_date = null;
              }
              targetIndicator.number_target = targetNumber;
              targetNumber += 1;
              await tocResultRepo.insert(targetIndicator);
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error in saveIndicatorTarget:", error);
      throw new Error(`Error saving toc results target: ${error}`);
    }
  }

  async saveTocResultsV2(
    data: any[],
    meta: {
      phase: string | null;
      original_id: string | null;
      version_id?: string | null;
    },
    globalSdgResults: TocSdgResults[] = [],
    globalImpactAreaResults: any[] = []
  ) {
    try {
      console.info({ message: "Saving ToC results V2" });
      const dataSource: DataSource = await Database.getDataSource();
      const repo = dataSource.getRepository(TocResults);
      const listResultsToc: TocResults[] = [];

      let listResultsIndicator: TocResultsIndicators[] = [];
      let listRegions: any[] = [];
      let listCountries: any[] = [];
      let listResultsSdg: TocResultsSdgResults[] = [];
      let listResultsImpact: TocResultsImpactAreaResults[] = [];

      if (!this.validatorType.validatorIsArray(data)) {
        return {
          listResultsToc,
          listResultsIndicator,
          listRegions,
          listCountries,
          listResultsSdg,
          listResultsImpact,
        };
      }

      const allowed = new Set(["OUTCOME", "OUTPUT", "EOI"]);
      const items = data.filter((it) => {
        const cat =
          typeof it?.category === "string" ? it.category.toUpperCase() : null;
        return cat && allowed.has(cat);
      });

      for (const item of items) {
        console.info({
          message: "Processing ToC result",
          itemId: item?.title,
          category: item?.category,
        });

        const toc_result_id =
          typeof item?.id === "string" || typeof item?.id === "number"
            ? String(item.id)
            : null;
        if (!toc_result_id) continue;

        const record: Partial<TocResults> = {
          toc_result_id,
          related_node_id:
            typeof item?.related_node_id === "string"
              ? item.related_node_id
              : null,
          result_title: typeof item?.title === "string" ? item.title : null,
          result_description:
            typeof item?.description === "string" ? item.description : null,
          category:
            typeof item?.category === "string"
              ? item.category.toUpperCase()
              : null,
          wp_id:
            typeof item?.group === "string" || typeof item?.group === "number"
              ? String(item.group)
              : null,

          id_toc_initiative:
            typeof meta?.original_id === "string" ? meta.original_id : null,
          phase: typeof meta?.phase === "string" ? meta.phase : null,
          version_id:
            typeof meta?.version_id === "string" ? meta.version_id : null,
          is_global: true,
          is_active: true,
        };

        const existing = await repo.findOne({
          where: {
            toc_result_id: record.toc_result_id,
            phase: record.phase as any,
          },
        });

        if (existing) {
          await repo.update(
            { toc_result_id: record.toc_result_id!, phase: record.phase! },
            record
          );
        } else {
          await repo.insert(record);
        }

        const saved = await repo.findOne({
          where: {
            toc_result_id: record.toc_result_id,
            phase: record.phase as any,
          },
        });
        if (!saved) continue;
        listResultsToc.push(saved);

        const projectsArray = Array.isArray(item?.projects)
          ? item.projects
          : [];
        if (projectsArray.length) {
          await this.saveResultProjectsV2(String(item.id), projectsArray);
        }

        const partnersArray = Array.isArray(item?.partners)
          ? item.partners
          : [];
        if (partnersArray.length) {
          await this.saveResultPartnersV2(String(item.id), partnersArray);
        }

        const indicatorsArray = Array.isArray(item?.indicators)
          ? item.indicators
          : [];
        const indRes = await this.tocResultsIndicatorV2(
          String(item.id),
          indicatorsArray,
          saved
        );
        listResultsIndicator.push(...indRes.listResultsIndicator);
        listRegions.push(...indRes.listRegions);
        listCountries.push(...indRes.listCountries);

        const sdgNested = Array.isArray(item?.sdg_results)
          ? item.sdg_results
          : item?.sdgs && Array.isArray(item.sdgs)
          ? item.sdgs
          : [];
        const sdgRel = await this.saveTocResultsSdgV2(
          String(item.id),
          sdgNested,
          globalSdgResults,
          saved
        );
        listResultsSdg.push(...sdgRel);

        const impactNested = Array.isArray(item?.impact_area_results)
          ? item.impact_area_results
          : item?.impact_areas && Array.isArray(item.impact_areas)
          ? item.impact_areas
          : [];
        const impactRel = await this.saveTocResultsImpactV2(
          String(item.id),
          impactNested,
          globalImpactAreaResults,
          saved
        );
        listResultsImpact.push(...impactRel);
      }

      return {
        listResultsToc,
        listResultsIndicator,
        listRegions,
        listCountries,
        listResultsSdg,
        listResultsImpact,
      };
    } catch (error) {
      throw new Error(`Error saving ToC results V2: ${error}`);
    }
  }

  async tocResultsIndicatorV2(
    id_result: string,
    indicators: any[],
    tocResultRow: TocResults
  ) {
    try {
      console.info({ message: "Saving ToC results indicators V2" });
      const dataSource: DataSource = await Database.getDataSource();
      const indicatorRepo = dataSource.getRepository(TocResultsIndicators);

      let listResultsIndicator: TocResultsIndicators[] = [];
      let listRegions: any[] = [];
      let listCountries: any[] = [];

      if (!this.validatorType.validatorIsArray(indicators)) {
        return { listResultsIndicator, listRegions, listCountries };
      }

      await indicatorRepo.update(
        { toc_results_id: tocResultRow.id },
        { is_active: false }
      );

      for (const ind of indicators) {
        if (!ind || (typeof ind.id !== "string" && typeof ind.id !== "number"))
          continue;

        const baselineRaw = Array.isArray(ind?.baseline)
          ? ind.baseline[0]
          : ind?.baseline;
        const baselineValue =
          baselineRaw && baselineRaw.value != null
            ? String(baselineRaw.value)
            : null;
        const baselineDate =
          typeof baselineRaw?.name === "string"
            ? baselineRaw.name
            : typeof baselineRaw?.date === "string"
            ? baselineRaw.date
            : null;

        const dto = new TocResultsIndicatorsDto();
        dto.toc_result_indicator_id =
          typeof ind.id === "string" || typeof ind.id === "number"
            ? String(ind.id)
            : null;
        dto.toc_results_id = tocResultRow.id;
        dto.indicator_description =
          typeof ind?.description === "string" ? ind.description : null;
        dto.unit_messurament =
          typeof ind?.unit_of_measurement === "string"
            ? ind.unit_of_measurement
            : null;
        dto.baseline_value = baselineValue;
        dto.baseline_date = baselineDate;

        dto.data_colletion_source =
          typeof ind?.data_collection_source === "string"
            ? ind.data_collection_source
            : null;
        dto.data_collection_method =
          typeof ind?.data_collection_method === "string"
            ? ind.data_collection_method
            : null;
        dto.frequency_data_collection =
          typeof ind?.data_collection_frequency === "string"
            ? ind.data_collection_frequency
            : null;
        dto.type_value =
          typeof ind?.type?.value === "string" ? ind.type.value : null;
        dto.type_name =
          typeof ind?.type?.name === "string" ? ind.type.name : null;
        dto.location = typeof ind?.location === "string" ? ind.location : null;
        dto.is_active = true;
        dto.toc_result_id_toc = id_result;
        dto.main = typeof ind?.main === "boolean" ? ind.main : null;
        dto.create_date =
          typeof ind?.creation_date === "string" ? ind.creation_date : null;
        dto.related_node_id =
          typeof ind?.related_node_id === "string"
            ? ind.related_node_id
            : String(ind.id);

        const exists = await indicatorRepo.findOne({
          where: {
            related_node_id: dto.related_node_id,
            toc_results_id: dto.toc_results_id,
          },
        });

        if (exists) {
          await indicatorRepo.update(
            {
              related_node_id: dto.related_node_id,
              toc_results_id: dto.toc_results_id,
            },
            dto
          );
        } else {
          await indicatorRepo.insert(dto);
        }

        const saved = await indicatorRepo.findOne({
          where: {
            related_node_id: dto.related_node_id,
            toc_results_id: dto.toc_results_id,
          },
        });
        if (saved) listResultsIndicator.push(saved);

        const geo = {
          regions: ind?.region ?? ind?.regions ?? [],
          country: ind?.country ?? ind?.countries ?? [],
        };
        const geoRes = await this.saveIndicatorGeoScopeV2(String(ind.id), {
          region: Array.isArray(ind?.region) ? ind.region : [],
          country: Array.isArray(ind?.country) ? ind.country : [],
        });
        listRegions.push(...geoRes.listRegios);
        listCountries.push(...geoRes.listCountries);

        if (saved && ind?.target != null) {
          await this.saveIndicatorTargetV2(
            saved.id,
            saved.toc_result_indicator_id,
            ind.target
          );
        }
      }

      return { listResultsIndicator, listRegions, listCountries };
    } catch (error) {
      throw new Error(`Error saving toc results indicators V2: ${error}`);
    }
  }

  async saveIndicatorGeoScopeV2(
    indicatorId: string,
    geo: { region?: any[]; country?: any[] }
  ) {
    try {
      console.info({ message: "Saving indicator geo scope V2" });
      const dataSource: DataSource = await Database.getDataSource();
      const regionRepo = dataSource.getRepository(TocResultIndicatorRegion);
      const countryRepo = dataSource.getRepository(TocResultIndicatorCountry);

      let listRegios: TocResultIndicatorRegionDto[] = [];
      let listCountries: TocResultIndicatorCountryDto[] = [];

      await regionRepo.delete({ toc_result_id: indicatorId as any });
      await countryRepo.delete({ toc_result_id: indicatorId as any });

      const regions = Array.isArray(geo?.region) ? geo.region : [];
      const seenRegions = new Set<number>();
      for (const r of regions) {
        const um49 =
          typeof r?.um49Code === "number"
            ? r.um49Code
            : typeof r?.code === "number"
            ? r.code
            : typeof r?.id === "number"
            ? r.id
            : null;
        if (um49 == null || seenRegions.has(um49)) continue;
        seenRegions.add(um49);

        const row = new TocResultIndicatorRegionDto();
        row.toc_result_id = indicatorId;
        row.clarisa_regions_id = um49;

        const exists = await regionRepo.findOne({
          where: {
            toc_result_id: row.toc_result_id as any,
            clarisa_regions_id: row.clarisa_regions_id as any,
          },
        });
        if (!exists) await regionRepo.save(row);
        listRegios.push(row);
      }

      const countries = Array.isArray(geo?.country) ? geo.country : [];
      const seenCountries = new Set<number>();
      for (const c of countries) {
        const code =
          typeof c?.code === "number"
            ? c.code
            : typeof c?.country_id === "number"
            ? c.country_id
            : null;
        if (code == null || seenCountries.has(code)) continue;
        seenCountries.add(code);

        const row = new TocResultIndicatorCountryDto();
        row.toc_result_id = indicatorId;
        row.clarisa_countries_id = code;

        const exists = await countryRepo.findOne({
          where: {
            toc_result_id: row.toc_result_id as any,
            clarisa_countries_id: row.clarisa_countries_id as any,
          },
        });
        if (!exists) await countryRepo.save(row);
        listCountries.push(row);
      }

      return { listRegios, listCountries };
    } catch (error) {
      throw new Error(`Error saving indicator geo scope V2: ${error}`);
    }
  }

  async saveIndicatorTargetV2(
    id_indicator: number,
    toc_result_indicator_id: string,
    target: any
  ) {
    console.info({ message: "Saving indicator targets V2" });
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const repo = dataSource.getRepository(TocResultIndicatorTarget);

      if (!id_indicator || !toc_result_indicator_id) return true;

      const targets: any[] = Array.isArray(target)
        ? target
        : target && typeof target === "object"
        ? [target]
        : [];

      await repo.delete({ toc_result_indicator_id });

      let number = 1;
      for (const t of targets) {
        if (!t) continue;

        const row = repo.create({
          id_indicator,
          toc_result_indicator_id,
          number_target: number++,
          target_value:
            typeof t.value === "number" && !Number.isNaN(t.value)
              ? t.value
              : typeof t.value === "string" &&
                t.value.trim() !== "" &&
                !Number.isNaN(Number(t.value))
              ? Number(t.value)
              : null,
          target_date:
            typeof t.date === "string" && t.date.trim() !== ""
              ? t.date.trim()
              : null,
        });

        await repo.insert(row);
      }

      return true;
    } catch (error) {
      console.error("Error in saveIndicatorTargetV2:", error);
      throw new Error(`Error saving indicator targets V2: ${error}`);
    }
  }

  async saveResultProjectsV2(toc_result_id_toc: string, projects: any[]) {
    console.info({ message: "Saving result Projects Bilateral" });
    const dataSource: DataSource = await Database.getDataSource();
    const projectRepo = dataSource.getRepository(TocResultProject);

    if (!Array.isArray(projects) || !toc_result_id_toc) return [];

    await projectRepo.delete({ toc_result_id_toc });

    const saved: TocResultProject[] = [];
    for (const p of projects) {
      const project_id =
        typeof p?.id === "string" || typeof p?.id === "number"
          ? String(p.id)
          : null;
      if (!project_id) continue;

      const row = projectRepo.create({
        toc_result_id_toc,
        project_id,
        name: typeof p?.name === "string" ? p.name : null,
        project_summary:
          typeof p?.project_summary === "string" ? p.project_summary : null,
        creation_date:
          typeof p?.creation_date === "string" ? p.creation_date : null,
        start_date: typeof p?.start_date === "string" ? p.start_date : null,
        end_date: typeof p?.end_date === "string" ? p.end_date : null,
      });

      await projectRepo.insert(row);
      saved.push(row);
    }
    return saved;
  }

  async saveResultPartnersV2(toc_result_id_toc: string, partners: any[]) {
    try {
      console.info({ message: "Saving result Partners V2" });
      const dataSource: DataSource = await Database.getDataSource();
      const partnerRepo = dataSource.getRepository(TocResultPartners);

      if (!Array.isArray(partners) || !toc_result_id_toc) return [];

      await partnerRepo.delete({ toc_result_id_toc });

      const saved: TocResultPartners[] = [];
      for (const p of partners) {
        if (!p) continue;

        const row = partnerRepo.create({
          toc_result_id_toc,
          toc_id: typeof p?.toc_id === "string" ? p.toc_id : null,
          name: typeof p?.name === "string" ? p.name : null,
          acronym: typeof p?.acronym === "string" ? p.acronym : null,
          code: typeof p?.code === "number" ? p.code : null,
          website_link:
            typeof p?.websiteLink === "string" ? p.websiteLink : null,
          added: typeof p?.added === "string" ? p.added : null,
          add_source: typeof p?.add_source === "string" ? p.add_source : null,
        });

        await partnerRepo.insert(row);
        saved.push(row);
      }
      return saved;
    } catch (error) {
      throw new Error(`Error saving result partners V2: ${error}`);
    }
  }

  async saveTocResultsSdgV2(
    toc_result_id_toc: string,
    nestedSdgArray: any[],
    globalSdgResults: TocSdgResults[],
    tocResultRow: TocResults
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const relRepo = dataSource.getRepository(TocResultsSdgResults);

      if (!Array.isArray(nestedSdgArray) || !tocResultRow?.id) return [];

      await relRepo.update(
        { toc_results_id: tocResultRow.id },
        { is_active: 0 }
      );

      const relations: TocResultsSdgResults[] = [];
      for (const sdgItem of nestedSdgArray) {
        const sdgTocResultId =
          typeof sdgItem?.id === "string" || typeof sdgItem?.id === "number"
            ? String(sdgItem.id)
            : typeof sdgItem?.toc_result_id === "string"
            ? sdgItem.toc_result_id
            : null;
        if (!sdgTocResultId) continue;

        const matched = globalSdgResults.find(
          (g) => g.toc_result_id === sdgTocResultId
        );
        if (!matched) continue;

        const dto = new TocResultsSdgResultsDto();
        dto.toc_results_id = tocResultRow.id;
        dto.toc_sdg_results_id = matched.id;
        dto.toc_results_id_toc = toc_result_id_toc;
        dto.toc_sdg_results_id_toc = sdgTocResultId;
        dto.is_active = 1;

        const existing = await relRepo.findOne({
          where: {
            toc_results_id: dto.toc_results_id,
            toc_sdg_results_id: dto.toc_sdg_results_id,
          },
        });

        if (existing) {
          await relRepo.update(
            {
              toc_results_id: dto.toc_results_id,
              toc_sdg_results_id: dto.toc_sdg_results_id,
            },
            dto
          );
          relations.push({ ...(existing as any), ...dto });
        } else {
          await relRepo.insert(dto);
          const saved = await relRepo.findOne({
            where: {
              toc_results_id: dto.toc_results_id,
              toc_sdg_results_id: dto.toc_sdg_results_id,
            },
          });
          if (saved) relations.push(saved);
        }
      }
      return relations;
    } catch (error) {
      throw new Error(`Error saving ToC results SDG relations V2: ${error}`);
    }
  }

  async saveTocResultsImpactV2(
    toc_result_id_toc: string,
    nestedImpactArray: any[],
    globalImpactAreaResults: any[],
    tocResultRow: TocResults
  ) {
    try {
      const dataSource: DataSource = await Database.getDataSource();
      const relRepo = dataSource.getRepository(TocResultsImpactAreaResults);

      if (!Array.isArray(nestedImpactArray) || !tocResultRow?.id) return [];

      const fkResultId = String(tocResultRow.id);

      await relRepo.update(
        { toc_results_id: fkResultId },
        { is_active: false }
      );

      const relations: TocResultsImpactAreaResults[] = [];
      for (const iaItem of nestedImpactArray) {
        const impactTocResultId =
          typeof iaItem?.id === "string" || typeof iaItem?.id === "number"
            ? String(iaItem.id)
            : typeof iaItem?.toc_result_id === "string"
            ? iaItem.toc_result_id
            : null;
        if (!impactTocResultId) continue;

        const matched = globalImpactAreaResults.find(
          (g) => g.toc_result_id === impactTocResultId
        );
        console.log(
          "🚀 ~ TocResultServices ~ saveTocResultsImpactV2 ~ matched:",
          matched
        );
        if (!matched) continue;

        const dto = new TocResultsImpactAreaResultsDto();
        dto.toc_results_id = fkResultId;
        dto.toc_impact_area_results_id = String(matched.id);
        dto.toc_results_id_toc = toc_result_id_toc;
        dto.toc_impact_area_results_id_toc = impactTocResultId;
        dto.is_active = true;

        const existing = await relRepo.findOne({
          where: {
            toc_results_id: dto.toc_results_id,
            toc_impact_area_results_id: dto.toc_impact_area_results_id,
          },
        });

        if (existing) {
          await relRepo.update(
            {
              toc_results_id: dto.toc_results_id,
              toc_impact_area_results_id: dto.toc_impact_area_results_id,
            },
            dto
          );
          relations.push({ ...(existing as any), ...dto });
        } else {
          await relRepo.insert(dto);
          const saved = await relRepo.findOne({
            where: {
              toc_results_id: dto.toc_results_id,
              toc_impact_area_results_id: dto.toc_impact_area_results_id,
            },
          });
          if (saved) relations.push(saved);
        }
      }
      return relations;
    } catch (error) {
      throw new Error(
        `Error saving ToC results impact area relations V2: ${error}`
      );
    }
  }
}
