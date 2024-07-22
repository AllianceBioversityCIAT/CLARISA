import { Injectable } from '@nestjs/common';
import { ImpactArea } from '../entities/impact-area.entity';
import { ImpactAreaDto } from '../dto/impact-area.dto';

@Injectable()
export class ImpactAreaMapper {
  public classToDto(impactArea: ImpactArea): ImpactAreaDto {
    const impactAreaDto: ImpactAreaDto = new ImpactAreaDto();

    impactAreaDto.id = impactArea.id;
    impactAreaDto.name = impactArea.name;
    impactAreaDto.icon = impactArea.icon;
    impactAreaDto.color = impactArea.color;

    return impactAreaDto;
  }

  public classListToDtoList(impactAreas: ImpactArea[]): ImpactAreaDto[] {
    return impactAreas.map((impactArea) => this.classToDto(impactArea));
  }
}
