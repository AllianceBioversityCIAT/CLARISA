import { Injectable } from '@nestjs/common';
import { InnovationType } from '../entities/innovation-type.entity';
import { InnovationTypeDto } from '../dto/innovation-type.dto';

@Injectable()
export class InnovationTypeMapper {
  public classToDto(
    innovationType: InnovationType,
    showIsActive: boolean = false,
  ): InnovationTypeDto {
    const innovationTypeDto: InnovationTypeDto = new InnovationTypeDto();

    innovationTypeDto.code = innovationType.id;
    innovationTypeDto.name = innovationType.name;
    innovationTypeDto.definition = innovationType.definition;
    if (showIsActive) {
      innovationTypeDto.is_active = innovationType.auditableFields?.is_active;
    }

    return innovationTypeDto;
  }

  public classListToDtoList(
    innovationTypes: InnovationType[],
    showIsActive: boolean = false,
  ): InnovationTypeDto[] {
    return innovationTypes.map((innovationType) =>
      this.classToDto(innovationType, showIsActive),
    );
  }
}
