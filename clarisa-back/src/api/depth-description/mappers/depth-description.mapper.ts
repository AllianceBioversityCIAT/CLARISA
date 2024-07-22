import { Injectable } from '@nestjs/common';
import { DepthDescription } from '../entities/depth-description.entity';
import { DepthDescriptionDto } from '../dto/depth-description.dto';

@Injectable()
export class DepthDescriptionMapper {
  public classToDto(depthDescription: DepthDescription): DepthDescriptionDto {
    const depthDescriptionDto: DepthDescriptionDto = new DepthDescriptionDto();

    depthDescriptionDto.depthScaleId = depthDescription.id;
    depthDescriptionDto.depthScaleName = depthDescription.name;

    return depthDescriptionDto;
  }

  public classListToDtoList(
    depthDescriptions: DepthDescription[],
  ): DepthDescriptionDto[] {
    return depthDescriptions.map((depthDescription) =>
      this.classToDto(depthDescription),
    );
  }
}
