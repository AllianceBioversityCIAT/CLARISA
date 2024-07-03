import { Cron } from '@nestjs/schedule';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiOST } from './api.ost';
import { WorkpackageOstDto } from './dto/workpackage.ost.dto';
import { InitiativeOstDto } from './dto/initivative.ost.dto';
import { firstValueFrom } from 'rxjs';
import { InitiativeStageOstDto } from './dto/initiative-stage.ost.dto';
import { WorkpackageCountryOstDto } from './dto/workpackage-country.ost.dto';
import { WorkpackageRegionOstDto } from './dto/workpackage-region.ost.dto';
import { WorkpackageRepository } from '../../../api/workpackage/repositories/workpackage.repository';
import { InitiativeRepository } from '../../../api/initiative/repositories/initiative.repository';
import { CountryRepository } from '../../../api/country/repositories/country.repository';
import { RegionRepository } from '../../../api/region/repositories/region.repository';
import { InitiativeStage } from '../../../api/initiative/entities/initiative-stage.entity';
import { WorkpackageCountry } from '../../../api/workpackage/entities/workpackage-country.entity';
import { WorkpackageRegion } from '../../../api/workpackage/entities/workpackage-region.entity';
import { Workpackage } from '../../../api/workpackage/entities/workpackage.entity';
import { Region } from '../../../api/region/entities/region.entity';
import { Country } from '../../../api/country/entities/country.entity';
import { Initiative } from '../../../api/initiative/entities/initiative.entity';
import { InitiativeStageRepository } from '../../../api/initiative/repositories/initiative-stage.repository';
import { WorkpackageCountryRepository } from '../../../api/workpackage/repositories/workpackage-country.repository';
import { WorkpackageRegionRepository } from '../../../api/workpackage/repositories/workpackage-country.repository copy';
import { AuditableEntity } from '../../entities/extends/auditable-entity.entity';

@Injectable()
export class CronOST {
  private readonly logger: Logger = new Logger(CronOST.name);

  constructor(
    private readonly api: ApiOST,
    private readonly workpackageRepository: WorkpackageRepository,
    private readonly initiativeRepository: InitiativeRepository,
    private readonly countryRepository: CountryRepository,
    private readonly regionRepository: RegionRepository,
    private readonly initiativeStageRepository: InitiativeStageRepository,
    private readonly workpackageCountryRepository: WorkpackageCountryRepository,
    private readonly workpackageRegionRepository: WorkpackageRegionRepository,
  ) {}

  // every sunday at 5 am
  @Cron('0 0 5 * * 0')
  public async cronWorkpackageRelatedData() {
    const workpackagesRequest = await firstValueFrom(
      this.api.getWorkpackages(),
    );

    if (workpackagesRequest && workpackagesRequest.status === HttpStatus.OK) {
      this.logger.debug('Started workpackage synchronization');
      const oldWorkpackagesDb: Workpackage[] =
        await this.workpackageRepository.find();

      let updatedWorkpackagesDb: Workpackage[] = [];
      let newWorkpackagesDb: Workpackage[] = [];

      const initiativeStagesDb: InitiativeStage[] =
        await this.initiativeStageRepository.find();

      await Promise.all(
        oldWorkpackagesDb.map(async (ow) => {
          ow.initiative_stage_object = initiativeStagesDb.find(
            (is) => is.id === ow.submission_tool_initiative_stage_id,
          );
        }),
      );

      const oldWorkpackageCountriesDb: WorkpackageCountry[] =
        await this.workpackageCountryRepository.find();
      const countries: Country[] = await this.countryRepository.find();
      let updatedWorkpackageCountriesDb: WorkpackageCountry[] = [];
      let newWorkpackageCountriesDb: WorkpackageCountry[] = [];

      await Promise.all(
        oldWorkpackageCountriesDb.map(async (owc) => {
          owc.country_object = countries.find((c) => c.id === owc.country_id);
        }),
      );

      const oldWorkpackageRegionsDb: WorkpackageRegion[] =
        await this.workpackageRegionRepository.find();
      const regions: Region[] = await this.regionRepository.find();
      let updatedWorkpackageRegionsDb: WorkpackageRegion[] = [];
      let newWorkpackageRegionsDb: WorkpackageRegion[] = [];

      await Promise.all(
        oldWorkpackageRegionsDb.map(async (owr) => {
          owr.region_object = regions.find((r) => r.id === owr.region_id);
        }),
      );

      const workpackagesOST: WorkpackageOstDto[] =
        workpackagesRequest.data?.response?.workpackages ?? [];
      const newWorkpackages: WorkpackageOstDto[] = CronOST.getNewWorkpackages(
        oldWorkpackagesDb,
        workpackagesOST,
      );

      oldWorkpackagesDb.forEach((w) => {
        const workpackageOst: WorkpackageOstDto = CronOST.updateWorkpackages(
          w,
          workpackagesOST,
        );

        if (workpackageOst) {
          const currentWorkpackageCountries: WorkpackageCountry[] =
            oldWorkpackageCountriesDb.filter(
              (owc) => owc.work_package_id === w.id,
            );
          const currentWorkpackageRegions: WorkpackageRegion[] =
            oldWorkpackageRegionsDb.filter(
              (owr) => owr.work_package_id === w.id,
            );

          const newWorkpackageCountries: WorkpackageCountryOstDto[] =
            CronOST.getNewWorkpackageCountries(
              w,
              currentWorkpackageCountries,
              workpackageOst,
            );

          const newWorkpackageRegions: WorkpackageRegionOstDto[] =
            CronOST.getNewWorkpackageRegions(
              w,
              currentWorkpackageRegions,
              workpackageOst,
            );

          currentWorkpackageCountries.forEach((owc) => {
            CronOST.updateWorkpackageCountries(
              owc,
              workpackageOst,
              workpackageOst.countries ?? [],
            );
            updatedWorkpackageCountriesDb.push(owc);
          });

          currentWorkpackageRegions.forEach((owr) => {
            CronOST.updateWorkpackageRegions(
              owr,
              workpackageOst,
              workpackageOst.regions ?? [],
            );
            updatedWorkpackageRegionsDb.push(owr);
          });

          newWorkpackageCountries.forEach((nwc) => {
            const wpCountry = countries.find(
              (c) => c.iso_numeric === nwc.country_id,
            );
            if (wpCountry) {
              const newWorkpackageCountry: WorkpackageCountry =
                CronOST.createNewWorkpackageCountry(
                  workpackageOst,
                  wpCountry,
                  w,
                );
              newWorkpackageCountriesDb.push(newWorkpackageCountry);
            } else {
              this.logger.warn(
                `The country with ISO numeric code ${
                  nwc.country_id
                } for the workpackage ${JSON.stringify(
                  nwc,
                )} could not be found`,
              );
            }
          });

          newWorkpackageRegions.forEach((nwr) => {
            const wpRegion = regions.find((r) => r.id === nwr.region_id);
            if (wpRegion) {
              const newWorkpackageRegion: WorkpackageRegion =
                CronOST.createNewWorkpackageRegion(workpackageOst, wpRegion, w);
              newWorkpackageRegionsDb.push(newWorkpackageRegion);
            } else {
              this.logger.warn(
                `The region with id ${
                  nwr.region_id
                } for the workpackage ${JSON.stringify(
                  nwr,
                )} could not be found`,
              );
            }
          });
        }

        updatedWorkpackagesDb.push(w);
      });

      newWorkpackages.forEach((nw) => {
        const dbInitiativeStage: InitiativeStage = initiativeStagesDb.find(
          (is) => is.id === nw.initvStgId,
        );
        if (dbInitiativeStage) {
          const newWorkpackage: Workpackage = CronOST.createNewWorkpackage(
            nw,
            dbInitiativeStage,
          );

          (nw.countries ?? []).forEach((nwc) => {
            const wpCountry = countries.find(
              (c) => c.iso_numeric === nwc.country_id,
            );
            if (wpCountry) {
              const newWorkpackageCountry: WorkpackageCountry =
                CronOST.createNewWorkpackageCountry(
                  nw,
                  wpCountry,
                  newWorkpackage,
                );
              newWorkpackage.countries.push(newWorkpackageCountry);
            } else {
              this.logger.warn(
                `The country with ISO-2 code ${
                  nwc.country_id
                } for the workpackage ${JSON.stringify(
                  nwc,
                )} could not be found`,
              );
            }
          });

          (nw.regions ?? []).forEach((nwr) => {
            const wpRegion = regions.find((r) => r.id === nwr.region_id);
            if (wpRegion) {
              const newWorkpackageRegion: WorkpackageRegion =
                CronOST.createNewWorkpackageRegion(
                  nw,
                  wpRegion,
                  newWorkpackage,
                );
              newWorkpackage.regions.push(newWorkpackageRegion);
            } else {
              this.logger.warn(
                `The region with acronym ${
                  nwr.acronym
                } for the workpackage ${JSON.stringify(
                  nwr,
                )} could not be found`,
              );
            }
          });

          newWorkpackagesDb.push(newWorkpackage);
        } else {
          this.logger.warn(
            `An initiative status could not be found in the DB for the workpackage ${JSON.stringify(
              nw,
            )}`,
          );
        }
      });

      updatedWorkpackagesDb = await this.workpackageRepository.save(
        updatedWorkpackagesDb,
      );

      newWorkpackagesDb =
        await this.workpackageRepository.save(newWorkpackagesDb);

      newWorkpackagesDb.forEach((nw) => {
        nw.countries.forEach((nwc) => {
          nwc.work_package_id = nw.id;
          newWorkpackageCountriesDb.push(nwc);
        });

        nw.regions.forEach((nwr) => {
          nwr.work_package_id = nw.id;
          newWorkpackageRegionsDb.push(nwr);
        });
      });

      updatedWorkpackageCountriesDb =
        await this.workpackageCountryRepository.save(
          updatedWorkpackageCountriesDb,
        );

      updatedWorkpackageRegionsDb = await this.workpackageRegionRepository.save(
        updatedWorkpackageRegionsDb,
      );

      newWorkpackageCountriesDb = await this.workpackageCountryRepository.save(
        newWorkpackageCountriesDb,
      );

      newWorkpackageRegionsDb = await this.workpackageRegionRepository.save(
        newWorkpackageRegionsDb,
      );
    }

    this.logger.debug('Finished workpackage synchronization');
  }

  private static getNewWorkpackages(
    workpackagesDb: Workpackage[],
    workpackagesOST: WorkpackageOstDto[],
  ): WorkpackageOstDto[] {
    return workpackagesOST.filter(
      (ost) =>
        !workpackagesDb.find(
          (db) =>
            db.initiative_stage_object?.initiative_id === ost.initiative_id &&
            db.initiative_stage_object?.stage_id === ost.stage_id &&
            db.wp_official_code === ost.wp_official_code,
        ),
    );
  }

  private static createNewWorkpackage(
    ostWorkpackage: WorkpackageOstDto,
    dbInitiativeStage: InitiativeStage,
  ): Workpackage {
    const newWorkpackage: Workpackage = new Workpackage();

    newWorkpackage.acronym = ostWorkpackage.acronym;
    newWorkpackage.auditableFields = new AuditableEntity();
    newWorkpackage.auditableFields.created_at = ostWorkpackage.created_at;
    newWorkpackage.auditableFields.created_by = 3043; //clarisadmin
    newWorkpackage.auditableFields.is_active = ostWorkpackage.active === 1;
    newWorkpackage.is_global_dimension = ostWorkpackage.is_global === 1;
    newWorkpackage.name = ostWorkpackage.name;
    newWorkpackage.pathway_content = ostWorkpackage.pathway_content;
    newWorkpackage.results = ostWorkpackage.results;
    newWorkpackage.submission_tool_initiative_stage_id = dbInitiativeStage.id;
    newWorkpackage.wp_official_code = ostWorkpackage.wp_official_code;

    newWorkpackage.countries = [];
    newWorkpackage.regions = [];

    return newWorkpackage;
  }

  private static updateWorkpackages(
    workpackage: Workpackage,
    ostWorkpackages: WorkpackageOstDto[],
  ): WorkpackageOstDto {
    const ostWorkpackage: WorkpackageOstDto = ostWorkpackages.find(
      (oi) =>
        workpackage.initiative_stage_object?.initiative_id ===
          oi.initiative_id &&
        workpackage.initiative_stage_object?.stage_id === oi.stage_id &&
        workpackage.wp_official_code === oi.wp_official_code,
    );

    if (ostWorkpackage) {
      workpackage.acronym = ostWorkpackage.acronym;
      workpackage.auditableFields.created_at = ostWorkpackage.created_at;
      workpackage.auditableFields.is_active = ostWorkpackage.active === 1;
      workpackage.is_global_dimension = ostWorkpackage.is_global === 1;
      workpackage.name = ostWorkpackage.name;
      workpackage.pathway_content = ostWorkpackage.pathway_content;
      workpackage.results = ostWorkpackage.results;
    } else {
      workpackage.auditableFields.is_active = false;
    }

    workpackage.auditableFields.updated_at = new Date();

    return ostWorkpackage;
  }

  private static getNewWorkpackageCountries(
    workpackage: Workpackage,
    workpackageCountriesDb: WorkpackageCountry[],
    workpackageOst: WorkpackageOstDto,
  ): WorkpackageCountryOstDto[] {
    return (workpackageOst.countries ?? []).filter(
      (ost) =>
        !workpackageCountriesDb.find(
          (db) =>
            db.work_package_id === workpackage.id &&
            db.country_object?.iso_numeric === ost.country_id,
        ),
    );
  }

  private static updateWorkpackageCountries(
    workpackageCountry: WorkpackageCountry,
    ostWorkpackage: WorkpackageOstDto,
    ostWorkpackageCountries: WorkpackageCountryOstDto[],
  ): WorkpackageCountryOstDto {
    const ostWorkpackageCountry: WorkpackageCountryOstDto =
      ostWorkpackageCountries.find(
        (owc) =>
          owc.country_id === workpackageCountry.country_object?.iso_numeric,
      );

    if (
      !ostWorkpackageCountry ||
      (ostWorkpackage && ostWorkpackage.active === 0)
    ) {
      workpackageCountry.auditableFields.is_active = false;
    }

    workpackageCountry.auditableFields.updated_at = new Date();
    workpackageCountry.auditableFields.updated_by = 3043; //clarisadmin

    return ostWorkpackageCountry;
  }

  private static createNewWorkpackageCountry(
    ostWorkpackage: WorkpackageOstDto,
    dbCountry: Country,
    dbWorkpackage: Workpackage,
  ): WorkpackageCountry {
    const newWorkpackageCountry: WorkpackageCountry = new WorkpackageCountry();

    newWorkpackageCountry.country_id = dbCountry.id;
    newWorkpackageCountry.auditableFields = new AuditableEntity();
    newWorkpackageCountry.auditableFields.created_at = new Date();
    newWorkpackageCountry.auditableFields.created_by = 3043; //clarisadmin
    newWorkpackageCountry.auditableFields.is_active =
      ostWorkpackage.active === 1;
    newWorkpackageCountry.auditableFields.updated_at = new Date();
    newWorkpackageCountry.work_package_id = dbWorkpackage.id;

    return newWorkpackageCountry;
  }

  private static getNewWorkpackageRegions(
    workpackage: Workpackage,
    workpackageRegionsDb: WorkpackageRegion[],
    workpackageOst: WorkpackageOstDto,
  ): WorkpackageRegionOstDto[] {
    return (workpackageOst.regions ?? []).filter(
      (ost) =>
        !workpackageRegionsDb.find(
          (db) =>
            db.work_package_id === workpackage.id &&
            db.region_object?.id === ost.region_id,
        ),
    );
  }

  private static updateWorkpackageRegions(
    workpackageRegion: WorkpackageRegion,
    ostWorkpackage: WorkpackageOstDto,
    ostWorkpackageRegions: WorkpackageRegionOstDto[],
  ): WorkpackageRegionOstDto {
    const ostWorkpackageRegion: WorkpackageRegionOstDto =
      ostWorkpackageRegions.find(
        (owc) => owc.region_id === workpackageRegion.region_object?.id,
      );

    if (
      !ostWorkpackageRegion ||
      (ostWorkpackage && ostWorkpackage.active === 0)
    ) {
      workpackageRegion.auditableFields.is_active = false;
    }

    workpackageRegion.auditableFields.updated_at = new Date();
    workpackageRegion.auditableFields.updated_by = 3043; //clarisadmin

    return ostWorkpackageRegion;
  }

  private static createNewWorkpackageRegion(
    ostWorkpackage: WorkpackageOstDto,
    dbRegion: Region,
    dbWorkpackage: Workpackage,
  ): WorkpackageRegion {
    const newWorkpackageRegion: WorkpackageRegion = new WorkpackageRegion();

    newWorkpackageRegion.region_id = dbRegion.id;
    newWorkpackageRegion.auditableFields = new AuditableEntity();
    newWorkpackageRegion.auditableFields.created_at = new Date();
    newWorkpackageRegion.auditableFields.created_by = 3043; //clarisadmin
    newWorkpackageRegion.auditableFields.is_active =
      ostWorkpackage.active === 1;
    newWorkpackageRegion.auditableFields.updated_at = new Date();
    newWorkpackageRegion.work_package_id = dbWorkpackage.id;

    return newWorkpackageRegion;
  }

  // every sunday at 4 am
  @Cron('0 0 4 * * 0')
  public async cronInitiativeRelatedData() {
    const initiativesRequest = await firstValueFrom(this.api.getInitiatives());

    if (initiativesRequest && initiativesRequest.status === HttpStatus.OK) {
      this.logger.debug('Started initiative synchronization');
      const oldInitiativesDb: Initiative[] =
        await this.initiativeRepository.find();
      let updatedInitiativesDb: Initiative[] = [];
      let newInitiativesDb: Initiative[] = [];

      const oldInitiativeStagesDb: InitiativeStage[] =
        await this.initiativeStageRepository.find();
      let updatedInitiativeStagesDb: InitiativeStage[] = [];
      let newInitiativeStagesDb: InitiativeStage[] = [];

      const initiativesOST: InitiativeOstDto[] =
        initiativesRequest.data?.response?.initiatives ?? [];
      const newInitiatives: InitiativeOstDto[] = CronOST.getNewInitiatives(
        oldInitiativesDb,
        initiativesOST,
      );

      oldInitiativesDb.forEach((i) => {
        const initiativeOst: InitiativeOstDto = CronOST.updateInitiative(
          i,
          initiativesOST,
        );

        if (initiativeOst) {
          const currentInitiativeStages: InitiativeStage[] =
            oldInitiativeStagesDb.filter((is) => is.initiative_id === i.id);

          const newInitiativeStages: InitiativeStageOstDto[] =
            CronOST.getNewInitiativeStatus(
              currentInitiativeStages,
              initiativeOst,
            );

          currentInitiativeStages.forEach((is) => {
            CronOST.updateInitiativeStages(
              is,
              initiativeOst,
              initiativeOst.stages ?? [],
            );
            updatedInitiativeStagesDb.push(is);
          });

          newInitiativeStages.forEach((nis) => {
            const newInitiativeStage: InitiativeStage =
              CronOST.createNewInitiativeStage(nis, initiativeOst, i);
            newInitiativeStagesDb.push(newInitiativeStage);
          });
        }

        updatedInitiativesDb.push(i);
      });

      newInitiatives.forEach((ni) => {
        const newInitiative: Initiative = CronOST.createNewInitiative(ni);

        (ni.stages ?? []).forEach((nis) => {
          const newInitiativeStage: InitiativeStage =
            CronOST.createNewInitiativeStage(nis, ni, newInitiative);
          newInitiative.initiative_stage_array.push(newInitiativeStage);
        });

        newInitiativesDb.push(newInitiative);
      });

      updatedInitiativesDb =
        await this.initiativeRepository.save(updatedInitiativesDb);

      newInitiativesDb = await this.initiativeRepository.save(newInitiativesDb);

      newInitiativesDb.forEach((ni) => {
        ni.initiative_stage_array.forEach((nis) => {
          nis.initiative_id = ni.id;
          newInitiativeStagesDb.push(nis);
        });
      });

      updatedInitiativeStagesDb = await this.initiativeStageRepository.save(
        updatedInitiativeStagesDb,
      );

      newInitiativeStagesDb = await this.initiativeStageRepository.save(
        newInitiativeStagesDb,
      );
    }

    this.logger.debug('Finished initiative synchronization');
  }

  private static getNewInitiatives(
    initiativesDb: Initiative[],
    initiativesOST: InitiativeOstDto[],
  ): InitiativeOstDto[] {
    return initiativesOST.filter(
      (ost) =>
        !initiativesDb.find((db) => db.official_code === ost.official_code),
    );
  }

  private static createNewInitiative(
    ostInitiative: InitiativeOstDto,
  ): Initiative {
    const newInitiative: Initiative = new Initiative();

    newInitiative.auditableFields = new AuditableEntity();
    newInitiative.auditableFields.created_at = new Date();
    newInitiative.auditableFields.created_by = 3043; //clarisadmin
    newInitiative.auditableFields.is_active = ostInitiative.active === 1;
    newInitiative.id = ostInitiative.id;
    newInitiative.name = ostInitiative.name;
    newInitiative.official_code = ostInitiative.official_code;
    newInitiative.short_name = ostInitiative.acronym ?? '';
    newInitiative.auditableFields.updated_at = new Date();

    newInitiative.initiative_stage_array = [];

    return newInitiative;
  }

  private static updateInitiative(
    initiative: Initiative,
    ostInitiatives: InitiativeOstDto[],
  ): InitiativeOstDto {
    const ostInitiative: InitiativeOstDto = ostInitiatives.find(
      (oi) => oi.official_code === initiative.official_code,
    );

    if (ostInitiative) {
      initiative.auditableFields.is_active = ostInitiative.active === 1;
      initiative.name = ostInitiative.name;
      initiative.short_name = ostInitiative.acronym ?? '';
    } else {
      initiative.auditableFields.is_active = false;
    }

    initiative.auditableFields.updated_at = new Date();
    initiative.auditableFields.updated_by = 3043; //clarisadmin

    return ostInitiative;
  }

  private static getNewInitiativeStatus(
    initiativeStagesDb: InitiativeStage[],
    initiativeOst: InitiativeOstDto,
  ): InitiativeStageOstDto[] {
    return (initiativeOst.stages ?? []).filter(
      (ost) =>
        !initiativeStagesDb.find(
          (db) =>
            db.initiative_id === initiativeOst.id &&
            db.stage_id === ost.stageId,
        ),
    );
  }

  private static createNewInitiativeStage(
    ostInitiativeStage: InitiativeStageOstDto,
    ostInitiative: InitiativeOstDto,
    dbInitiative: Initiative,
  ): InitiativeStage {
    const newInitiativeStage: InitiativeStage = new InitiativeStage();

    newInitiativeStage.id = +ostInitiativeStage.initvStgId;
    newInitiativeStage.action_area_id = ostInitiative.action_area_id
      ? +ostInitiative.action_area_id
      : null;
    newInitiativeStage.auditableFields = new AuditableEntity();
    newInitiativeStage.auditableFields.created_at = new Date();
    newInitiativeStage.auditableFields.created_by = 3043; //clarisadmin
    newInitiativeStage.initiative_id = dbInitiative.id;
    newInitiativeStage.auditableFields.is_active =
      ostInitiativeStage.active === 1;
    //TODO: uncoment when ost send this field
    //newInitiativeStage.is_global_dimension = ostInitiativeStage
    newInitiativeStage.stage_id = ostInitiativeStage.stageId;
    newInitiativeStage.status = ostInitiative.status;
    newInitiativeStage.auditableFields.updated_at = new Date();

    return newInitiativeStage;
  }

  private static updateInitiativeStages(
    initiativeStage: InitiativeStage,
    ostInitiative: InitiativeOstDto,
    ostInitiativeStages: InitiativeStageOstDto[],
  ): InitiativeStageOstDto {
    const ostInitiativeStage: InitiativeStageOstDto = ostInitiativeStages.find(
      (ois) => ois.stageId === initiativeStage.stage_id,
    );

    if (ostInitiativeStage) {
      initiativeStage.action_area_id = ostInitiative.action_area_id
        ? +ostInitiative.action_area_id
        : null;
      initiativeStage.auditableFields.is_active =
        ostInitiativeStage.active === 1;
      //TODO: uncoment when ost send this field
      //initiativeStage.is_global_dimension = ostInitiative;
      initiativeStage.status = ostInitiative.status;
    } else {
      initiativeStage.auditableFields.is_active = false;
    }

    initiativeStage.auditableFields.updated_at = new Date();
    initiativeStage.auditableFields.updated_by = 3043; //clarisadmin

    return ostInitiativeStage;
  }
}
