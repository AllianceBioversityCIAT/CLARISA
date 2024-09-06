import { Cron } from '@nestjs/schedule';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { OSTApi } from './ost.api';
import {
  WorkpackageOstDto,
  WorkpackageResponse,
} from './dto/workpackage.ost.dto';
import {
  InitiativeOstDto,
  InitiativeResponse,
} from './dto/initivative.ost.dto';
import { firstValueFrom } from 'rxjs';
import { InitiativeStageOstDto } from './dto/initiative-stage.ost.dto';
import { WorkpackageCountryOstDto } from './dto/workpackage-country.ost.dto';
import { WorkpackageRegionOstDto } from './dto/workpackage-region.ost.dto';
import { WorkpackageRepository } from '../../api/workpackage/repositories/workpackage.repository';
import { InitiativeRepository } from '../../api/initiative/repositories/initiative.repository';
import { CountryRepository } from '../../api/country/repositories/country.repository';
import { RegionRepository } from '../../api/region/repositories/region.repository';
import { InitiativeStageRepository } from '../../api/initiative/repositories/initiative-stage.repository';
import { WorkpackageCountryRepository } from '../../api/workpackage/repositories/workpackage-country.repository';
import { WorkpackageRegionRepository } from '../../api/workpackage/repositories/workpackage-country.repository copy';
import { Workpackage } from '../../api/workpackage/entities/workpackage.entity';
import { InitiativeStage } from '../../api/initiative/entities/initiative-stage.entity';
import { WorkpackageCountry } from '../../api/workpackage/entities/workpackage-country.entity';
import { Country } from '../../api/country/entities/country.entity';
import { WorkpackageRegion } from '../../api/workpackage/entities/workpackage-region.entity';
import { Region } from '../../api/region/entities/region.entity';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';
import { Initiative } from '../../api/initiative/entities/initiative.entity';
import { Immutable } from '../../shared/utils/deep-immutable';
import { AxiosResponse } from 'axios';
import { ResponseOstDto } from './dto/response.ost.dto';

@Injectable()
export class OSTCron {
  private readonly logger: Logger = new Logger(OSTCron.name);

  constructor(
    private readonly api: Immutable<OSTApi>,
    /* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
    private readonly workpackageRepository: WorkpackageRepository,
    private readonly initiativeRepository: InitiativeRepository,
    private readonly countryRepository: CountryRepository,
    private readonly regionRepository: RegionRepository,
    private readonly initiativeStageRepository: InitiativeStageRepository,
    private readonly workpackageCountryRepository: WorkpackageCountryRepository,
    private readonly workpackageRegionRepository: WorkpackageRegionRepository,
    /* eslint-enable @typescript-eslint/prefer-readonly-parameter-types */
  ) {}

  // every sunday at 5 am
  @Cron('0 0 5 * * 0')
  public async cronWorkpackageRelatedData(): Promise<void> {
    const workpackagesRequest = (await firstValueFrom(
      this.api.getWorkpackages(),
    )) as Partial<AxiosResponse<ResponseOstDto<WorkpackageResponse>>> | null;

    if (workpackagesRequest && workpackagesRequest.status === HttpStatus.OK) {
      this.logger.debug('Started workpackage synchronization');
      const oldWorkpackagesDb: Workpackage[] =
        await this.workpackageRepository.find();

      let updatedWorkpackagesDb: Workpackage[] = [];
      let newWorkpackagesDb: Workpackage[] = [];

      const initiativeStagesDb: InitiativeStage[] =
        await this.initiativeStageRepository.find();

      oldWorkpackagesDb.map((ow) => {
        ow.initiative_stage_object = initiativeStagesDb.find(
          (is) => is.id === ow.submission_tool_initiative_stage_id,
        ) as InitiativeStage;
      });

      const oldWorkpackageCountriesDb: WorkpackageCountry[] =
        await this.workpackageCountryRepository.find();
      const countries: Country[] = await this.countryRepository.find();
      let updatedWorkpackageCountriesDb: WorkpackageCountry[] = [];
      let newWorkpackageCountriesDb: WorkpackageCountry[] = [];

      oldWorkpackageCountriesDb.map((owc) => {
        owc.country_object = countries.find(
          (c) => c.id === owc.country_id,
        ) as Country;
      });

      const oldWorkpackageRegionsDb: WorkpackageRegion[] =
        await this.workpackageRegionRepository.find();
      const regions: Region[] = await this.regionRepository.find();
      let updatedWorkpackageRegionsDb: WorkpackageRegion[] = [];
      let newWorkpackageRegionsDb: WorkpackageRegion[] = [];

      oldWorkpackageRegionsDb.map((owr) => {
        owr.region_object = regions.find(
          (r) => r.id === owr.region_id,
        ) as Region;
      });

      const workpackagesOST: WorkpackageOstDto[] =
        workpackagesRequest.data?.response?.workpackages ?? [];
      const newWorkpackages: WorkpackageOstDto[] = OSTCron.getNewWorkpackages(
        oldWorkpackagesDb,
        workpackagesOST,
      );

      oldWorkpackagesDb.forEach((w) => {
        const workpackageOst: WorkpackageOstDto | undefined =
          OSTCron.updateWorkpackages(w, workpackagesOST);

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
            OSTCron.getNewWorkpackageCountries(
              w,
              currentWorkpackageCountries,
              workpackageOst,
            );

          const newWorkpackageRegions: WorkpackageRegionOstDto[] =
            OSTCron.getNewWorkpackageRegions(
              w,
              currentWorkpackageRegions,
              workpackageOst,
            );

          currentWorkpackageCountries.forEach((owc) => {
            OSTCron.updateWorkpackageCountries(
              owc,
              workpackageOst,
              workpackageOst.countries ?? [],
            );
            updatedWorkpackageCountriesDb.push(owc);
          });

          currentWorkpackageRegions.forEach((owr) => {
            OSTCron.updateWorkpackageRegions(
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
                OSTCron.createNewWorkpackageCountry(
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
                OSTCron.createNewWorkpackageRegion(workpackageOst, wpRegion, w);
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
        const dbInitiativeStage: InitiativeStage | undefined =
          initiativeStagesDb.find((is) => is.id === nw.initvStgId);
        if (dbInitiativeStage) {
          const newWorkpackage: Workpackage = OSTCron.createNewWorkpackage(
            nw,
            dbInitiativeStage,
          );

          (nw.countries ?? []).forEach((nwc) => {
            const wpCountry = countries.find(
              (c) => c.iso_numeric === nwc.country_id,
            );
            if (wpCountry) {
              const newWorkpackageCountry: WorkpackageCountry =
                OSTCron.createNewWorkpackageCountry(
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
                OSTCron.createNewWorkpackageRegion(
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
    workpackagesDb: Immutable<Workpackage[]>,
    workpackagesOST: Immutable<WorkpackageOstDto[]>,
  ): WorkpackageOstDto[] {
    return workpackagesOST.filter(
      (ost) =>
        !workpackagesDb.find(
          (db) =>
            db.initiative_stage_object.initiative_id === ost.initiative_id &&
            db.initiative_stage_object.stage_id === ost.stage_id &&
            db.wp_official_code === ost.wp_official_code,
        ),
    ) as WorkpackageOstDto[];
  }

  private static createNewWorkpackage(
    ostWorkpackage: Immutable<WorkpackageOstDto>,
    dbInitiativeStage: Immutable<InitiativeStage>,
  ): Workpackage {
    const newWorkpackage: Workpackage = new Workpackage();

    newWorkpackage.acronym = ostWorkpackage.acronym;
    newWorkpackage.is_global_dimension = Boolean(ostWorkpackage.is_global);
    newWorkpackage.name = ostWorkpackage.name;
    newWorkpackage.pathway_content = ostWorkpackage.pathway_content;
    newWorkpackage.results = ostWorkpackage.results;
    newWorkpackage.submission_tool_initiative_stage_id = dbInitiativeStage.id;
    newWorkpackage.wp_official_code = ostWorkpackage.wp_official_code;

    newWorkpackage.auditableFields = new AuditableEntity();
    newWorkpackage.auditableFields.created_at = ostWorkpackage.created_at;
    newWorkpackage.auditableFields.created_by = 3043; //clarisadmin
    newWorkpackage.auditableFields.is_active = Boolean(ostWorkpackage.active);

    newWorkpackage.countries = [];
    newWorkpackage.regions = [];

    return newWorkpackage;
  }

  private static updateWorkpackages(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    workpackage: Workpackage,
    ostWorkpackages: Immutable<WorkpackageOstDto[]>,
  ): WorkpackageOstDto | undefined {
    const ostWorkpackage: WorkpackageOstDto | undefined = ostWorkpackages.find(
      (oi) =>
        workpackage.initiative_stage_object.initiative_id ===
          oi.initiative_id &&
        workpackage.initiative_stage_object.stage_id === oi.stage_id &&
        workpackage.wp_official_code === oi.wp_official_code,
    ) as WorkpackageOstDto | undefined;

    if (ostWorkpackage) {
      workpackage.acronym = ostWorkpackage.acronym;
      workpackage.auditableFields.created_at = ostWorkpackage.created_at;
      workpackage.auditableFields.is_active = Boolean(ostWorkpackage.active);
      workpackage.is_global_dimension = Boolean(ostWorkpackage.is_global);
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
    workpackage: Immutable<Workpackage>,
    workpackageCountriesDb: Immutable<WorkpackageCountry[]>,
    workpackageOst: Immutable<WorkpackageOstDto>,
  ): WorkpackageCountryOstDto[] {
    return (workpackageOst.countries ?? []).filter(
      (ost) =>
        !workpackageCountriesDb.find(
          (db) =>
            db.work_package_id === workpackage.id &&
            db.country_object.iso_numeric === ost.country_id,
        ),
    );
  }

  private static updateWorkpackageCountries(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    workpackageCountry: WorkpackageCountry,
    ostWorkpackage: Immutable<WorkpackageOstDto> | undefined,
    ostWorkpackageCountries: Immutable<WorkpackageCountryOstDto[]>,
  ): WorkpackageCountryOstDto | undefined {
    const ostWorkpackageCountry: WorkpackageCountryOstDto | undefined =
      ostWorkpackageCountries.find(
        (owc) =>
          owc.country_id === workpackageCountry.country_object.iso_numeric,
      );

    if (!ostWorkpackageCountry || (ostWorkpackage && !ostWorkpackage.active)) {
      workpackageCountry.auditableFields.is_active = false;
    }

    workpackageCountry.auditableFields.updated_at = new Date();
    workpackageCountry.auditableFields.updated_by = 3043; //clarisadmin

    return ostWorkpackageCountry;
  }

  private static createNewWorkpackageCountry(
    ostWorkpackage: Immutable<WorkpackageOstDto>,
    dbCountry: Immutable<Country>,
    dbWorkpackage: Immutable<Workpackage>,
  ): WorkpackageCountry {
    const newWorkpackageCountry: WorkpackageCountry = new WorkpackageCountry();

    newWorkpackageCountry.country_id = dbCountry.id;
    newWorkpackageCountry.work_package_id = dbWorkpackage.id;

    newWorkpackageCountry.auditableFields = new AuditableEntity();
    newWorkpackageCountry.auditableFields.created_at = new Date();
    newWorkpackageCountry.auditableFields.created_by = 3043; //clarisadmin
    newWorkpackageCountry.auditableFields.is_active = Boolean(
      ostWorkpackage.active,
    );
    newWorkpackageCountry.auditableFields.updated_at = new Date();

    return newWorkpackageCountry;
  }

  private static getNewWorkpackageRegions(
    workpackage: Immutable<Workpackage>,
    workpackageRegionsDb: Immutable<WorkpackageRegion[]>,
    workpackageOst: Immutable<WorkpackageOstDto>,
  ): WorkpackageRegionOstDto[] {
    return (workpackageOst.regions ?? []).filter(
      (ost) =>
        !workpackageRegionsDb.find(
          (db) =>
            db.work_package_id === workpackage.id &&
            db.region_object.id === ost.region_id,
        ),
    );
  }

  private static updateWorkpackageRegions(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    workpackageRegion: WorkpackageRegion,
    ostWorkpackage: Immutable<WorkpackageOstDto> | undefined,
    ostWorkpackageRegions: Immutable<WorkpackageRegionOstDto[]>,
  ): WorkpackageRegionOstDto | undefined {
    const ostWorkpackageRegion: WorkpackageRegionOstDto | undefined =
      ostWorkpackageRegions.find(
        (owc) => owc.region_id === workpackageRegion.region_object.id,
      );

    if (!ostWorkpackageRegion || (ostWorkpackage && !ostWorkpackage.active)) {
      workpackageRegion.auditableFields.is_active = false;
    }

    workpackageRegion.auditableFields.updated_at = new Date();
    workpackageRegion.auditableFields.updated_by = 3043; //clarisadmin

    return ostWorkpackageRegion;
  }

  private static createNewWorkpackageRegion(
    ostWorkpackage: Immutable<WorkpackageOstDto>,
    dbRegion: Immutable<Region>,
    dbWorkpackage: Immutable<Workpackage>,
  ): WorkpackageRegion {
    const newWorkpackageRegion: WorkpackageRegion = new WorkpackageRegion();

    newWorkpackageRegion.region_id = dbRegion.id;
    newWorkpackageRegion.work_package_id = dbWorkpackage.id;

    newWorkpackageRegion.auditableFields = new AuditableEntity();
    newWorkpackageRegion.auditableFields.created_at = new Date();
    newWorkpackageRegion.auditableFields.created_by = 3043; //clarisadmin
    newWorkpackageRegion.auditableFields.is_active = Boolean(
      ostWorkpackage.active,
    );
    newWorkpackageRegion.auditableFields.updated_at = new Date();

    return newWorkpackageRegion;
  }

  // every sunday at 4 am
  @Cron('0 0 4 * * 0')
  public async cronInitiativeRelatedData(): Promise<void> {
    const initiativesRequest = (await firstValueFrom(
      this.api.getInitiatives(),
    )) as Partial<AxiosResponse<ResponseOstDto<InitiativeResponse>>> | null;

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
      const newInitiatives: InitiativeOstDto[] = OSTCron.getNewInitiatives(
        oldInitiativesDb,
        initiativesOST,
      );

      oldInitiativesDb.forEach((i) => {
        const initiativeOst: InitiativeOstDto | undefined =
          OSTCron.updateInitiative(i, initiativesOST);

        if (initiativeOst) {
          const currentInitiativeStages: InitiativeStage[] =
            oldInitiativeStagesDb.filter((is) => is.initiative_id === i.id);

          const newInitiativeStages: InitiativeStageOstDto[] =
            OSTCron.getNewInitiativeStatus(
              currentInitiativeStages,
              initiativeOst,
            );

          currentInitiativeStages.forEach((is) => {
            OSTCron.updateInitiativeStages(
              is,
              initiativeOst,
              initiativeOst.stages ?? [],
            );
            updatedInitiativeStagesDb.push(is);
          });

          newInitiativeStages.forEach((nis) => {
            const newInitiativeStage: InitiativeStage =
              OSTCron.createNewInitiativeStage(nis, initiativeOst, i);
            newInitiativeStagesDb.push(newInitiativeStage);
          });
        }

        updatedInitiativesDb.push(i);
      });

      newInitiatives.forEach((ni) => {
        const newInitiative: Initiative = OSTCron.createNewInitiative(ni);

        (ni.stages ?? []).forEach((nis) => {
          const newInitiativeStage: InitiativeStage =
            OSTCron.createNewInitiativeStage(nis, ni, newInitiative);
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
    initiativesDb: Immutable<Initiative[]>,
    initiativesOST: Immutable<InitiativeOstDto[]>,
  ): InitiativeOstDto[] {
    return initiativesOST.filter(
      (ost) =>
        !initiativesDb.find((db) => db.official_code === ost.official_code),
    ) as InitiativeOstDto[];
  }

  private static createNewInitiative(
    ostInitiative: Immutable<InitiativeOstDto>,
  ): Initiative {
    const newInitiative: Initiative = new Initiative();

    newInitiative.id = ostInitiative.id;
    newInitiative.name = ostInitiative.name;
    newInitiative.official_code = ostInitiative.official_code;
    newInitiative.short_name = ostInitiative.acronym ?? '';

    newInitiative.auditableFields = new AuditableEntity();
    newInitiative.auditableFields.created_at = new Date();
    newInitiative.auditableFields.created_by = 3043; //clarisadmin
    newInitiative.auditableFields.is_active = Boolean(ostInitiative.active);
    newInitiative.auditableFields.updated_at = new Date();

    newInitiative.initiative_stage_array = [];

    return newInitiative;
  }

  private static updateInitiative(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    initiative: Initiative,
    ostInitiatives: Immutable<InitiativeOstDto[]>,
  ): InitiativeOstDto | undefined {
    const ostInitiative: InitiativeOstDto | undefined = ostInitiatives.find(
      (oi) => oi.official_code === initiative.official_code,
    ) as InitiativeOstDto | undefined;

    if (ostInitiative) {
      initiative.auditableFields.is_active = Boolean(ostInitiative.active);
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
    initiativeStagesDb: Immutable<InitiativeStage[]>,
    initiativeOst: Immutable<InitiativeOstDto>,
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
    ostInitiativeStage: Immutable<InitiativeStageOstDto>,
    ostInitiative: Immutable<InitiativeOstDto>,
    dbInitiative: Immutable<Initiative>,
  ): InitiativeStage {
    const newInitiativeStage: InitiativeStage = new InitiativeStage();

    newInitiativeStage.id = +ostInitiativeStage.initvStgId;
    newInitiativeStage.action_area_id = ostInitiative.action_area_id
      ? +ostInitiative.action_area_id
      : undefined;
    newInitiativeStage.auditableFields = new AuditableEntity();
    newInitiativeStage.auditableFields.created_at = new Date();
    newInitiativeStage.auditableFields.created_by = 3043; //clarisadmin
    newInitiativeStage.initiative_id = dbInitiative.id;
    newInitiativeStage.auditableFields.is_active = Boolean(
      ostInitiativeStage.active,
    );
    newInitiativeStage.stage_id = ostInitiativeStage.stageId;
    newInitiativeStage.status = ostInitiative.status;
    newInitiativeStage.auditableFields.updated_at = new Date();

    return newInitiativeStage;
  }

  private static updateInitiativeStages(
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    initiativeStage: InitiativeStage,
    ostInitiative: Immutable<InitiativeOstDto>,
    ostInitiativeStages: Immutable<InitiativeStageOstDto[]>,
  ): InitiativeStageOstDto | undefined {
    const ostInitiativeStage: InitiativeStageOstDto | undefined =
      ostInitiativeStages.find(
        (ois) => ois.stageId === initiativeStage.stage_id,
      );

    if (ostInitiativeStage) {
      initiativeStage.action_area_id = ostInitiative.action_area_id
        ? +ostInitiative.action_area_id
        : undefined;
      initiativeStage.auditableFields.is_active = Boolean(
        ostInitiativeStage.active,
      );
      initiativeStage.status = ostInitiative.status;
    } else {
      initiativeStage.auditableFields.is_active = false;
    }

    initiativeStage.auditableFields.updated_at = new Date();
    initiativeStage.auditableFields.updated_by = 3043; //clarisadmin

    return ostInitiativeStage;
  }
}
