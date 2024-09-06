import { Injectable } from '@nestjs/common';
import { BasicDto } from '../entities/dtos/basic-dto';

@Injectable()
export class BasicDtoMapper<E> {
  public classToDto(
    entity: E,
    showIsActive: boolean = false,
    mappedFields: BasicDtoEquivalences<E> = {
      code: 'id' as keyof E,
      name: 'name' as keyof E,
      description: 'description' as keyof E,
      is_active: 'auditableFields.is_active' as keyof E,
    },
  ): BasicDto {
    const dto: BasicDto = new BasicDto();
    Object.keys(mappedFields).forEach((key) => {
      if (key === 'is_active' && !showIsActive) return;
      const entityKey = mappedFields[key] as string;
      const entityProperty = entityKey.split('.');
      let propertyValue: unknown = null;
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      while (entityProperty.length > 0) {
        propertyValue = entity[entityProperty.shift() as string];
      }
      dto[key] = propertyValue;
    });

    return dto;
  }

  public classListToDtoList(
    entities: readonly E[],
    showIsActive: boolean = false,
    mappedFields: BasicDtoEquivalences<E> = {
      code: 'id' as keyof E,
      name: 'name' as keyof E,
      description: 'description' as keyof E,
      is_active: 'auditableFields.is_active' as keyof E,
    },
  ): BasicDto[] {
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
