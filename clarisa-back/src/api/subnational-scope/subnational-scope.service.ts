import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SubnationalScopeRepository } from './repositories/subnational-scope.repository';
import { SubnationalScopeDto } from './dto/subnational-scope.dto';

@Injectable()
export class SubnationalScopeService {
  constructor(
    private subnationalScopesRepository: SubnationalScopeRepository,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    country_id?: number,
    country_iso_alpha_2?: string,
  ): Promise<SubnationalScopeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.subnationalScopesRepository.findSubnationalScope(
      option,
      country_id,
      country_iso_alpha_2,
    );
  }

  async findOne(id: number): Promise<SubnationalScopeDto> {
    return await this.subnationalScopesRepository.findOneSubnationalScope(id);
  }
}
