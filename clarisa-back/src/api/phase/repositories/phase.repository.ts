import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Phase } from '../entities/phase.entity';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { PhaseStatus } from '../../../shared/entities/enums/phase-status';
import { PRMSApplication } from '../../../shared/entities/enums/prms-applications';
import { getMetadataArgsStorage } from 'typeorm';
import { BadParamsError } from '../../../shared/errors/bad-params.error';

@Injectable()
export class PhaseRepository {
  private readonly _logger: Logger = new Logger(PhaseRepository.name);
  public phaseRepositories: Map<string, Repository<ObjectLiteral & Phase>> =
    new Map();

  constructor(private dataSource: DataSource) {
    const phaseTables: PRMSApplication[] = PRMSApplication.getAllPhaseTables();

    const phaseTableMetadatas = getMetadataArgsStorage().tables.filter((t) =>
      phaseTables.find((p) => p.tableName == t.name),
    );

    phaseTableMetadatas.map((ptm) => {
      this.phaseRepositories.set(
        ptm.name,
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
    const incomingMis = PRMSApplication.getfromSimpleName(prmsApp);

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

    switch (incomingMis) {
      case PRMSApplication.ALL:
        for (const key of this.phaseRepositories.keys()) {
          const currentMisPhases = (await this.phaseRepositories.get(key).find({
            where: whereClause,
          })) as Phase[];
          phases = phases.concat(
            currentMisPhases.map((cmp) => {
              cmp['application'] =
                PRMSApplication.getfromTableName(key)?.prettyName;
              return cmp;
            }),
          );
        }
        break;
      case PRMSApplication.REPORTING_TOOL:
      case PRMSApplication.IPSR:
      case PRMSApplication.TOC:
      case PRMSApplication.OST:
      case PRMSApplication.RISK:
        phases = (await this.phaseRepositories.get(incomingMis.tableName).find({
          where: whereClause,
        })) as Phase[];
        break;
      default:
        throw new BadParamsError('Phases', 'prmsApp', prmsApp);
    }

    return phases;
  }
}
