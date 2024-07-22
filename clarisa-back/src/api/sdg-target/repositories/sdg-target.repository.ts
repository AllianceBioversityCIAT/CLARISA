import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SdgTarget } from '../entities/sdg-target.entity';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { SdgTargetIpsrDto } from '../dto/sdg-target-ipsr.dto';

@Injectable()
export class SdgTargetRepository extends Repository<SdgTarget> {
  findAllForIpsr(
    option: FindAllOptions = FindAllOptions.SHOW_ALL,
  ): Promise<SdgTargetIpsrDto[]> {
    let whereCondition = '';
    if (option !== FindAllOptions.SHOW_ALL) {
      whereCondition = `where sdgt.is_active = ${option === FindAllOptions.SHOW_ONLY_ACTIVE}`;
    }

    const query = `
      select 
        sdgt.id, sdgt.sdg_target_code as sdgTargetCode, 
        sdgt.sdg_target as sdgTarget, sdg.id as usndCode
      from sustainable_development_goal_targets sdgt 
      join sustainable_development_goals sdg on sdg.id = sdgt.sdg_id 
      ${whereCondition}
    `;

    return this.query(query) as Promise<SdgTargetIpsrDto[]>;
  }
  constructor(private dataSource: DataSource) {
    super(SdgTarget, dataSource.createEntityManager());
  }
}
