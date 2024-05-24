import { Injectable } from '@nestjs/common';
import { BasicDtoV2 } from '../entities/dtos/basic-dto.v2';

@Injectable()
export class BasicDtoMapper<E> {
  public classToDto(
    entity: E,
    showIsActive: boolean = false,
    mappedFields: BasicDtoEquivalences<E> = <any>{
      code: 'id',
      name: 'name',
      description: 'description',
      is_active: 'auditableFields.is_active',
    },
  ): BasicDtoV2 {
    const dto: BasicDtoV2 = new BasicDtoV2();
    Object.keys(mappedFields).forEach((key) => {
      if (key === 'is_active' && !showIsActive) return;
      const entityKey: string = mappedFields[key];
      dto[key] = entityKey
        .split('.')
        .reduce((prev, curr) => prev && prev[curr], entity);
    });

    return dto;
  }

  public classListToDtoList(
    entities: E[],
    showIsActive: boolean = false,
    mappedFields: BasicDtoEquivalences<E> = <any>{
      code: 'id',
      name: 'name',
      description: 'description',
      is_active: 'auditableFields.is_active',
    },
  ): BasicDtoV2[] {
    return entities.map((entity) =>
      this.classToDto(entity, showIsActive, mappedFields),
    );
  }
}

export interface BasicDtoEquivalences<E> {
  code?: keyof E;
  name?: keyof E;
  description?: keyof E;
  is_active?: keyof E;
}
