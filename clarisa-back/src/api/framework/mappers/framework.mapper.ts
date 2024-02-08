import { Injectable } from '@nestjs/common';
import { FrameworkDto } from '../dto/framework.dto';
import { Framework } from '../entities/framework.entity';

@Injectable()
export class FrameworkMapper {
  classToDto(framework: Framework): FrameworkDto {
    const frameworkDto: FrameworkDto = new FrameworkDto();
    frameworkDto.id = framework.id;
    frameworkDto.name = framework.name;
    frameworkDto.description = framework.description;
    frameworkDto.currently_in_use = framework.currently_in_use;
    return frameworkDto;
  }
}
