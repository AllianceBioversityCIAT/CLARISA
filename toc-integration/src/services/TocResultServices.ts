import { DataSource, In } from "typeorm";
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
import { TocResultIndicatorTargetCenter } from "../entities/tocResultIndicatorTargetCenter";
import { TocResultProject } from "../entities/tocResultsProjects";
import { TocResultPartners } from "../entities/tocResultsPartners";
import { TocSdgResults } from "../entities/tocSdgResults";
import { TocResultsMelias } from "../entities/tocResultsMelias";
import { TocResultsMeliasCountry } from "../entities/tocResultsMeliasCountry";
import { TocResultsMeliasContacts } from "../entities/tocResultsMeliasContacts";
import { TocResultsMeliasRegion } from "../entities/tocResultsMeliasRegion";
import { TocWorkPackages } from "../entities/tocWorkPackages";

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
            indicator.measure_of_success_moderate =
              typeof indicatorItem.measure_of_success_moderate === "string"
                ? indicatorItem.measure_of_success_moderate
                : null;
            indicator.measure_of_success_minimum =
              typeof indicatorItem.measure_of_success_minimum === "string"
                ? indicatorItem.measure_of_success_minimum
                : null;
            indicator.measure_of_success_maximum =
              typeof indicatorItem.measure_of_success_maximum === "string"
                ? indicatorItem.measure_of_success_maximum
                : null;
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
      official_code: string | null;
    },
    globalSdgResults: TocSdgResults[] = [],
    globalImpactAreaResults: any[] = []
  ) {
    try {
      console.info({ message: "Saving ToC results V2" });
      const dataSource: DataSource = await Database.getDataSource();
      const repo = dataSource.getRepository(TocResults);
      const workPackageRepo = dataSource.getRepository(TocWorkPackages);
      const listResultsToc: TocResults[] = [];

      let listResultsIndicator: TocResultsIndicators[] = [];
      let listRegions: any[] = [];
      let listCountries: any[] = [];
      let listResultsSdg: TocResultsSdgResults[] = [];
      let listResultsImpact: TocResultsImpactAreaResults[] = [];
      let listMelias: TocResultsMelias[] = [];
      let listMeliasCountries: TocResultsMeliasCountry[] = [];
      let listMeliasRegions: TocResultsMeliasRegion[] = [];
      let listMeliasContacts: TocResultsMeliasContacts[] = [];

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

      const groupIds = Array.from(
        new Set(
          items
            .map((it) =>
              typeof it?.group === "string" || typeof it?.group === "number"
                ? String(it.group)
                : null
            )
            .filter((id): id is string => !!id)
        )
      );

      const workPackageMap = new Map<string, string>();
      if (groupIds.length) {
        const workPackages = await workPackageRepo.find({
          where: { id: In(groupIds) },
        });
        for (const wp of workPackages) {
          if (typeof wp.id === "string" && typeof wp.toc_id === "string") {
            workPackageMap.set(wp.id, wp.toc_id);
          }
        }
      }

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

        const groupId =
          typeof item?.group === "string" || typeof item?.group === "number"
            ? String(item.group)
            : null;
        let mappedTocId =
          groupId && workPackageMap.size
            ? workPackageMap.get(groupId) ?? null
            : null;
        if (groupId && !mappedTocId) {
          const fallbackWorkPackage = await workPackageRepo.findOne({
            where: { id: groupId },
          });
          if (
            fallbackWorkPackage &&
            typeof fallbackWorkPackage.toc_id === "string"
          ) {
            mappedTocId = fallbackWorkPackage.toc_id;
            workPackageMap.set(groupId, mappedTocId);
          } else {
            console.warn({
              message: "Missing work package mapping for result group",
              groupId,
            });
          }
        }

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
          wp_id: mappedTocId,
          id_toc_initiative:
            typeof meta?.original_id === "string" ? meta.original_id : null,
          phase: typeof meta?.phase === "string" ? meta.phase : null,
          version_id:
            typeof meta?.version_id === "string" ? meta.version_id : null,
          official_code: meta?.official_code ?? null,
          responsible_organization:
            typeof item?.responsible_organization?.code === "number"
              ? String(item.responsible_organization.code)
              : typeof item?.responsible_organization?.code === "string"
              ? item.responsible_organization.code
              : null,
          is_global: true,
          is_active: true,
        };

        const hasRelatedNodeId =
          typeof record.related_node_id === "string" && record.related_node_id;

        let saved: TocResults | null = null;

        if (hasRelatedNodeId) {
          // Buscar exclusivamente por related_node_id
          const existing = await repo.findOne({
            where: { related_node_id: record.related_node_id },
          });

          if (existing) {
            // Actualizar registro existente
            await repo.update(
              { related_node_id: record.related_node_id },
              record
            );
          } else {
            // Insertar nuevo registro
            await repo.insert(record);
          }

          // Recuperar el registro guardado/actualizado
          saved = await repo.findOne({
            where: { related_node_id: record.related_node_id },
          });
        } else {
          // Si no hay related_node_id, solo hacer INSERT
          const insertResult = await repo.insert(record);
          const identifier = insertResult.identifiers?.[0];

          if (identifier?.id) {
            saved = await repo.findOne({ where: { id: identifier.id } });
          }
        }

        if (!saved) continue;
        listResultsToc.push(saved);

        const projectsArray = Array.isArray(item?.projects)
          ? item.projects
          : [];
        if (projectsArray.length) {
          await this.saveResultProjectsV2(
            String(item?.related_node_id),
            projectsArray
          );
        }

        const partnersArray = Array.isArray(item?.partners)
          ? item.partners
          : [];
        if (partnersArray.length) {
          await this.saveResultPartnersV2(
            String(item.related_node_id),
            partnersArray
          );
        }

        const quantitativeIndicators = Array.isArray(
          item?.quantitative_indicators
        )
          ? item.quantitative_indicators
          : Array.isArray(item?.indicators)
          ? item.indicators
          : [];
        const qualitativeIndicators = Array.isArray(
          item?.qualitative_indicators
        )
          ? item.qualitative_indicators
          : [];
        const indicatorsArray = [
          ...quantitativeIndicators,
          ...qualitativeIndicators,
        ];

        const indRes = await this.tocResultsIndicatorV2(
          String(item.related_node_id),
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
          String(item.related_node_id),
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
          String(item.related_node_id),
          impactNested,
          globalImpactAreaResults,
          saved
        );
        listResultsImpact.push(...impactRel);

        const meliasArray = Array.isArray(item?.melias) ? item.melias : [];
        const tocResultIdToc =
          typeof item?.related_node_id === "string"
            ? item.related_node_id
            : null;
        if (meliasArray.length) {
          const meliasRes = await this.saveResultMeliasV2(
            saved,
            tocResultIdToc,
            meliasArray
          );
          listMelias.push(...meliasRes.listMelias);
          listMeliasCountries.push(...meliasRes.listCountries);
          listMeliasRegions.push(...meliasRes.listRegions);
          listMeliasContacts.push(...meliasRes.listContacts);
        } else {
          await this.clearMeliasForResult(saved);
        }
      }

      return {
        listResultsToc,
        listResultsIndicator,
        listRegions,
        listCountries,
        listResultsSdg,
        listResultsImpact,
        listMelias,
        listMeliasCountries,
        listMeliasRegions,
        listMeliasContacts,
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

      if (tocResultRow.related_node_id) {
        await indicatorRepo.update(
          { toc_result_id_toc: tocResultRow.related_node_id },
          { is_active: false }
        );
      }

      for (const ind of indicators) {
        console.log({ processingIndicator: ind });
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
        dto.measure_of_success_moderate =
          typeof ind?.measure_of_success_moderate === "string"
            ? ind.measure_of_success_moderate
            : null;
        dto.measure_of_success_minimum =
          typeof ind?.measure_of_success_minimum === "string"
            ? ind.measure_of_success_minimum
            : null;
        dto.measure_of_success_maximum =
          typeof ind?.measure_of_success_maximum === "string"
            ? ind.measure_of_success_maximum
            : null;

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

        const targetData = ind?.targets ?? ind?.target;
        if (saved && targetData != null) {
          await this.saveIndicatorTargetV2(
            saved.id,
            saved.related_node_id,
            targetData
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
        console.log({ processingRegion: r });
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
      const targetCenterRepo = dataSource.getRepository(
        TocResultIndicatorTargetCenter
      );

      if (!id_indicator || !toc_result_indicator_id) return true;

      const targets: any[] = Array.isArray(target)
        ? target
        : target && typeof target === "object"
        ? [target]
        : [];

      const existingByIdIndicator = await repo.find({
        where: { id_indicator },
      });

      const existingByTocResultIndicatorId = await repo.find({
        where: { toc_result_indicator_id },
      });

      if (existingByIdIndicator.length > 0) {
        console.info({
          message: "Deleting existing targets by id_indicator",
          id_indicator,
          count: existingByIdIndicator.length,
        });
        await repo.delete({ id_indicator });
      }

      if (existingByTocResultIndicatorId.length > 0) {
        console.info({
          message: "Deleting existing targets by toc_result_indicator_id",
          toc_result_indicator_id,
          count: existingByTocResultIndicatorId.length,
        });
        await repo.delete({ toc_result_indicator_id });
      }

      let number = 0;
      for (const t of targets) {
        console.log({ processingTarget: t });
        if (!t) continue;

        const yearEntries = Object.entries(t).filter(([key]) =>
          /^\d{4}$/.test(String(key))
        );
        const centers = Array.isArray(t?.centers) ? t.centers : [];
        const projects = Array.isArray(t?.projects) ? t.projects : [];

        const parseNumeric = (value: any): number | null => {
          if (typeof value === "number" && Number.isFinite(value)) return value;
          if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) return parsed;
          }
          return null;
        };

        const parseValue = (value: any): number | null => {
          if (typeof value === "number" && Number.isFinite(value)) return value;
          if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? null : parsed;
          }
          return null;
        };

        const centerIds: number[] = Array.from(
          new Set<number>(
            centers
              .map((center) =>
                parseNumeric(center?.code ?? center?.center_id ?? center?.id)
              )
              .filter((id): id is number => id != null)
          )
        );
        const projectIds: number[] = Array.from(
          new Set<number>(
            projects
              .map((project) =>
                parseNumeric(
                  project?.code ?? project?.project_id ?? project?.id
                )
              )
              .filter((id): id is number => id != null)
          )
        );

        const rowsToInsert: Partial<TocResultIndicatorTarget>[] = [];
        const centersPerRow: number[][] = [];

        if (yearEntries.length) {
          if (projectIds.length) {
            for (const projectId of projectIds) {
              for (const [year, value] of yearEntries) {
                rowsToInsert.push(
                  repo.create({
                    id_indicator,
                    toc_result_indicator_id,
                    number_target: number++,
                    target_value: parseValue(value),
                    target_date: String(year),
                    center_id: null,
                    project_id: projectId,
                  })
                );
                centersPerRow.push(centerIds);
              }
            }
          } else {
            for (const [year, value] of yearEntries) {
              rowsToInsert.push(
                repo.create({
                  id_indicator,
                  toc_result_indicator_id,
                  number_target: number++,
                  target_value: parseValue(value),
                  target_date: String(year),
                  center_id: null,
                  project_id: null,
                })
              );
              centersPerRow.push(centerIds);
            }
          }
        } else {
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
            center_id: null,
            project_id: null,
          });
          rowsToInsert.push(row);
          centersPerRow.push(centerIds);
        }

        if (rowsToInsert.length) {
          const savedTargets = await repo.save(rowsToInsert);
          const centerRows: TocResultIndicatorTargetCenter[] = [];
          savedTargets.forEach((saved, idx) => {
            const centersForRow = centersPerRow[idx];
            if (!centersForRow?.length) return;

            for (const centerId of centersForRow) {
              centerRows.push(
                targetCenterRepo.create({
                  toc_indicator_target_id: saved.toc_result_indicator_id,
                  center_id: centerId,
                })
              );
            }
          });

          if (centerRows.length) {
            await targetCenterRepo.save(centerRows);
          }
        }
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

  async saveResultMeliasV2(
    tocResultRow: TocResults,
    toc_result_id_toc: string | null,
    melias: any[]
  ): Promise<{
    listMelias: TocResultsMelias[];
    listCountries: TocResultsMeliasCountry[];
    listRegions: TocResultsMeliasRegion[];
    listContacts: TocResultsMeliasContacts[];
  }> {
    console.info({ message: "Saving result MELIAs V2" });
    const dataSource: DataSource = await Database.getDataSource();
    const meliaRepo = dataSource.getRepository(TocResultsMelias);
    const countryRepo = dataSource.getRepository(TocResultsMeliasCountry);
    const regionRepo = dataSource.getRepository(TocResultsMeliasRegion);
    const contactRepo = dataSource.getRepository(TocResultsMeliasContacts);

    if (!tocResultRow?.id) {
      return {
        listMelias: [],
        listCountries: [],
        listRegions: [],
        listContacts: [],
      };
    }

    const meliaArray = Array.isArray(melias) ? melias : [];
    if (!meliaArray.length) {
      await this.clearMeliasForResult(tocResultRow);
      return {
        listMelias: [],
        listCountries: [],
        listRegions: [],
        listContacts: [],
      };
    }

    const previousMelias = await meliaRepo.find({
      where: { toc_result_id: tocResultRow.id },
    });
    const previousIds = previousMelias
      .map((m) => m.melia_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (previousIds.length) {
      await countryRepo.delete({ melia_id: In(previousIds) });
      await regionRepo.delete({ melia_id: In(previousIds) });
      await contactRepo.delete({ melia_id: In(previousIds) });
    }

    await meliaRepo.delete({ toc_result_id: tocResultRow.id });

    const listMelias: TocResultsMelias[] = [];
    const listCountries: TocResultsMeliasCountry[] = [];
    const listRegions: TocResultsMeliasRegion[] = [];
    const listContacts: TocResultsMeliasContacts[] = [];

    for (const meliaItem of meliaArray) {
      const meliaId =
        typeof meliaItem?.id === "string" || typeof meliaItem?.id === "number"
          ? String(meliaItem.id)
          : typeof meliaItem?.melia_id === "string"
          ? meliaItem.melia_id
          : null;

      if (!meliaId) continue;

      const center = meliaItem?.center ?? {};
      const meliaType = meliaItem?.melia_type ?? {};
      const reportedIndicators = meliaItem?.reported_indicators_count ?? {};

      const row = meliaRepo.create({
        melia_id: meliaId,
        toc_result_id: tocResultRow.id,
        toc_result_id_toc,
        main: typeof meliaItem?.main === "boolean" ? meliaItem.main : false,
        methods_and_design_approaches:
          typeof meliaItem?.methods_and_design_approaches === "string"
            ? meliaItem.methods_and_design_approaches
            : null,
        updating_date:
          typeof meliaItem?.updating_date === "string"
            ? meliaItem.updating_date
            : null,
        flow: typeof meliaItem?.flow === "string" ? meliaItem.flow : null,
        flow_id:
          typeof meliaItem?.flow_id === "string" ? meliaItem.flow_id : null,
        title: typeof meliaItem?.title === "string" ? meliaItem.title : meliaId,
        description:
          typeof meliaItem?.description === "string"
            ? meliaItem.description
            : null,
        geographic_scope:
          typeof meliaItem?.geographic_scope === "string"
            ? meliaItem.geographic_scope
            : null,
        specification:
          typeof meliaItem?.specification === "string"
            ? meliaItem.specification
            : null,
        creation_date:
          typeof meliaItem?.creation_date === "string"
            ? meliaItem.creation_date
            : null,
        end_date:
          typeof meliaItem?.end_date === "string" ? meliaItem.end_date : null,
        center_toc_id:
          typeof center?.toc_id === "string" ? center.toc_id : null,
        center_acronym:
          typeof center?.acronym === "string" ? center.acronym : null,
        center_name: typeof center?.name === "string" ? center.name : null,
        center_code: typeof center?.code === "number" ? center.code : null,
        melia_type_id: typeof meliaType?.id === "string" ? meliaType.id : null,
        melia_type_title:
          typeof meliaType?.title === "string" ? meliaType.title : null,
        melia_type_description:
          typeof meliaType?.description === "string"
            ? meliaType.description
            : null,
        melia_type_color:
          typeof meliaType?.color === "string" ? meliaType.color : null,
        melia_type_main:
          typeof meliaType?.main === "boolean" ? meliaType.main : false,
        melia_type_creation_date:
          typeof meliaType?.creation_date === "string"
            ? meliaType.creation_date
            : null,
        reported_indicators_low:
          typeof reportedIndicators?.low === "number"
            ? reportedIndicators.low
            : null,
        reported_indicators_high:
          typeof reportedIndicators?.high === "number"
            ? reportedIndicators.high
            : null,
      });

      await meliaRepo.insert(row);
      listMelias.push(row);

      const countries = await this.saveMeliaCountriesV2(
        dataSource,
        meliaId,
        meliaItem?.country
      );
      listCountries.push(...countries);

      const regions = await this.saveMeliaRegionsV2(
        dataSource,
        meliaId,
        meliaItem?.region
      );
      listRegions.push(...regions);

      const contacts = await this.saveMeliaContactsV2(
        dataSource,
        meliaId,
        meliaItem?.contacts
      );
      listContacts.push(...contacts);
    }

    return { listMelias, listCountries, listRegions, listContacts };
  }

  private async saveMeliaCountriesV2(
    dataSource: DataSource,
    meliaId: string,
    countries: any[]
  ) {
    const repo = dataSource.getRepository(TocResultsMeliasCountry);

    await repo.delete({ melia_id: meliaId });

    const rows: TocResultsMeliasCountry[] = [];
    const countryArray = Array.isArray(countries) ? countries : [];

    for (const country of countryArray) {
      const code =
        typeof country?.code === "number"
          ? country.code
          : typeof country?.country_id === "number"
          ? country.country_id
          : null;

      const row = repo.create({
        melia_id: meliaId,
        toc_id: typeof country?.toc_id === "string" ? country.toc_id : null,
        name: typeof country?.name === "string" ? country.name : null,
        code,
        country_name:
          typeof country?.country_name === "string"
            ? country.country_name
            : null,
      });

      await repo.insert(row);
      rows.push(row);
    }

    return rows;
  }

  private async saveMeliaRegionsV2(
    dataSource: DataSource,
    meliaId: string,
    regions: any[]
  ) {
    const repo = dataSource.getRepository(TocResultsMeliasRegion);

    await repo.delete({ melia_id: meliaId });

    const rows: TocResultsMeliasRegion[] = [];
    const regionArray = Array.isArray(regions) ? regions : [];

    for (const region of regionArray) {
      const um49 =
        typeof region?.um49Code === "number"
          ? region.um49Code
          : typeof region?.code === "number"
          ? region.code
          : null;

      const row = repo.create({
        melia_id: meliaId,
        toc_id: typeof region?.toc_id === "string" ? region.toc_id : null,
        um49_code: um49,
        name: typeof region?.name === "string" ? region.name : null,
        region_id:
          typeof region?.region_id === "string" ? region.region_id : null,
      });

      await repo.insert(row);
      rows.push(row);
    }

    return rows;
  }

  private async saveMeliaContactsV2(
    dataSource: DataSource,
    meliaId: string,
    contacts: any[]
  ) {
    const repo = dataSource.getRepository(TocResultsMeliasContacts);

    await repo.delete({ melia_id: meliaId });

    const rows: TocResultsMeliasContacts[] = [];
    const contactArray = Array.isArray(contacts) ? contacts : [];

    for (const contact of contactArray) {
      const contactId =
        typeof contact?.id === "string" || typeof contact?.id === "number"
          ? String(contact.id)
          : null;
      if (!contactId) continue;

      const row = repo.create({
        melia_id: meliaId,
        contact_id: contactId,
        first_name:
          typeof contact?.first_name === "string" ? contact.first_name : null,
        last_name:
          typeof contact?.last_name === "string" ? contact.last_name : null,
        email: typeof contact?.email === "string" ? contact.email : null,
        related_node_id:
          typeof contact?.related_node_id === "string"
            ? contact.related_node_id
            : null,
        main: typeof contact?.main === "boolean" ? contact.main : false,
        creation_date:
          typeof contact?.creation_date === "string"
            ? contact.creation_date
            : null,
      });

      await repo.insert(row);
      rows.push(row);
    }

    return rows;
  }

  private async clearMeliasForResult(tocResultRow: TocResults) {
    if (!tocResultRow?.id) return;

    const dataSource: DataSource = await Database.getDataSource();
    const meliaRepo = dataSource.getRepository(TocResultsMelias);
    const countryRepo = dataSource.getRepository(TocResultsMeliasCountry);
    const regionRepo = dataSource.getRepository(TocResultsMeliasRegion);
    const contactRepo = dataSource.getRepository(TocResultsMeliasContacts);

    const existing = await meliaRepo.find({
      where: { toc_result_id: tocResultRow.id },
    });

    const existingIds = existing
      .map((m) => m.melia_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (existingIds.length) {
      await countryRepo.delete({ melia_id: In(existingIds) });
      await regionRepo.delete({ melia_id: In(existingIds) });
      await contactRepo.delete({ melia_id: In(existingIds) });
    }

    await meliaRepo.delete({ toc_result_id: tocResultRow.id });
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
