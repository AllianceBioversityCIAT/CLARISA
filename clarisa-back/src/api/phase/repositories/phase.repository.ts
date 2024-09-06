import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  getMetadataArgsStorage,
} from 'typeorm';
import { Phase } from '../entities/phase.entity';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { PhaseStatus } from '../../../shared/entities/enums/phase-status';
import { PRMSApplication } from '../../../shared/entities/enums/prms-applications';
import { Immutable } from '../../../shared/utils/deep-immutable';

@Injectable()
export class PhaseRepository {
  private readonly _logger: Logger = new Logger(PhaseRepository.name);
  public phaseRepositories: Map<string, Repository<ObjectLiteral & Phase>> =
    new Map();

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  constructor(private readonly dataSource: Readonly<DataSource>) {
    const phaseTables: PRMSApplication[] = PRMSApplication.getAllPhaseTables();

    const phaseTableMetadatas = getMetadataArgsStorage().tables.filter((t) =>
      phaseTables.find((p) => p.tableName === t.name),
    );

    phaseTableMetadatas.map((ptm) => {
      this.phaseRepositories.set(
        ptm.name as string,
        this.dataSource.getRepository(ptm.target),
      );
    });
  }

  async findAllPhases(
    status: string = PhaseStatus.ALL.path,
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    prmsApp: string = PRMSApplication.ALL.simpleName,
  ): Promise<Phase[]> {
    let whereClause: FindOptionsWhere<Phase> = {};
    const incomingStatus = PhaseStatus.getfromPath(status);

    switch (incomingStatus) {
      case PhaseStatus.ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case PhaseStatus.SHOW_ONLY_OPEN:
      case PhaseStatus.SHOW_ONLY_CLOSED:
        whereClause = {
          ...whereClause,
          is_open: incomingStatus === PhaseStatus.SHOW_ONLY_OPEN,
        };
        break;
    }

    switch (show) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          ...whereClause,
          auditableFields: {
            is_active: show === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
    }

    let phases: Phase[] = [];

    phases = await this._getPhasesByMis(prmsApp, whereClause);

    return phases;
  }

  private async _getPhasesByMis(
    prmsApp: string,
    whereClause: Immutable<FindOptionsWhere<Phase>>,
  ): Promise<Phase[]> {
    const incomingMis = PRMSApplication.getfromSimpleName(prmsApp);
    switch (incomingMis) {
      case PRMSApplication.ALL:
        const allPhases: Phase[] = [];
        for (const key of this.phaseRepositories.keys()) {
          const currentMisPhases = await this._getPhasesByKey(key, whereClause);
          allPhases.push(...currentMisPhases);
        }
        return allPhases;
      case PRMSApplication.REPORTING_TOOL:
      case PRMSApplication.IPSR:
      case PRMSApplication.TOC:
      case PRMSApplication.OST:
      case PRMSApplication.RISK:
        return this._getPhasesByKey(incomingMis.tableName, whereClause);
      default:
        throw Error(`The mis "${prmsApp}" was not found!`);
    }
  }

  private async _getPhasesByKey(
    key: string,
    whereClause: Immutable<FindOptionsWhere<Phase>>,
  ): Promise<Phase[]> {
    const repository = this.phaseRepositories.get(key);
    if (repository) {
      const currentMisPhases = (await repository.find({
        where: whereClause as FindOptionsWhere<Phase>,
      })) as Phase[];
      return currentMisPhases.map((cmp) => {
        cmp.application = PRMSApplication.getfromTableName(key)
          ?.prettyName as string;
        return cmp;
      });
    }
    return [];
  }
}
