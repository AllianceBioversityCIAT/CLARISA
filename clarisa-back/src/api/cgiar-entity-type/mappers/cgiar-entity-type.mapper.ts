import { Injectable } from '@nestjs/common';
import { CgiarEntityType } from '../entities/cgiar-entity-type.entity';
import { CgiarEntityTypeDto } from '../dto/cgiar-entity-type.dto';

@Injectable()
export class CgiarEntityTypeMapper {
  classToDto(cgiarEntityType: CgiarEntityType): CgiarEntityTypeDto {
    const cgiarEntityTypeDto: CgiarEntityTypeDto = new CgiarEntityTypeDto();

    cgiarEntityTypeDto.name = cgiarEntityType.name;
    cgiarEntityTypeDto.code = cgiarEntityType.id;

    return cgiarEntityTypeDto;
  }
}
