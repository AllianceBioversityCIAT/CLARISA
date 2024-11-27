import { Injectable } from '@nestjs/common';
import { GeographicScope } from '../entities/geographic-scope.entity';
import { GeographicScopeDto } from '../dto/geographic-scope.dto';

@Injectable()
export class GeographicScopeMapper {
  public classToDto(geographicScope: GeographicScope): GeographicScopeDto {
    const geographicScopeDto: GeographicScopeDto = new GeographicScopeDto();

    geographicScopeDto.code = geographicScope.id;
    geographicScopeDto.name = geographicScope.name;
    geographicScopeDto.definition = geographicScope.definition;

    return geographicScopeDto;
  }

  public classListToDtoList(
    geographicScopes: GeographicScope[],
  ): GeographicScopeDto[] {
    return geographicScopes.map((geographicScope) =>
      this.classToDto(geographicScope),
    );
  }
}
