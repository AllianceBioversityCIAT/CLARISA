import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ActionAreaOutcome } from '../entities/action-area-outcome.entity';
import { OneActionAreaOutcomeDto } from '../dto/one-action-area-outcome.dto';

@Injectable()
export class ActionAreaOutcomeRepository extends Repository<ActionAreaOutcome> {
  constructor(private dataSource: DataSource) {
    super(ActionAreaOutcome, dataSource.createEntityManager());
  }

  async findActionAreaOutcomeById(
    id: number,
  ): Promise<OneActionAreaOutcomeDto> {
    return this.createQueryBuilder('aao')
      .where('aao.id = :id', { id })
      .select([
        'aao.id as id',
        'aao.smo_code as smo_code',
        'aao.outcome_statement as outcome_statement',
        'aao.auditableFields.is_active as is_active',
      ])
      .getRawOne();
  }
}
