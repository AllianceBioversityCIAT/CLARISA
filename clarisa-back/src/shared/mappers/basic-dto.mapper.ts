import { Injectable } from '@nestjs/common';
import { BasicDtoV2 } from '../entities/dtos/basic.v2.dto';
import { BasicDtoV1 } from '../entities/dtos/basic.v1.dto';

@Injectable()
export class BasicDtoMapper<E> {
  public classToDtoV2(
    entity: E,
    showIsActive: boolean = false,
    mappedFields: BasicDtoV2Equivalences<E> = <any>{
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

  public classListToDtoV2List(
    entities: E[],
    showIsActive: boolean = false,
    mappedFields: BasicDtoV2Equivalences<E> = <any>{
      code: 'id',
      name: 'name',
      description: 'description',
      is_active: 'auditableFields.is_active',
    },
  ): BasicDtoV2[] {
    return entities.map((entity) =>
      this.classToDtoV2(entity, showIsActive, mappedFields),
    );
  }

  public classToDtoV1(
    entity: E,
    showIsActive: boolean = false,
    mappedFields: BasicDtoV1Equivalences<E> = <any>{
      id: 'id',
      name: 'name',
      description: 'description',
      is_active: 'auditableFields.is_active',
    },
  ): BasicDtoV1 {
    const dto: BasicDtoV1 = new BasicDtoV1();
    Object.keys(mappedFields).forEach((key) => {
      if (key === 'is_active' && !showIsActive) return;
      const entityKey: string = mappedFields[key];
      dto[key] = entityKey
        .split('.')
        .reduce((prev, curr) => prev && prev[curr], entity);
    });

    return dto;
  }

  public classListToDtoV1List(
    entities: E[],
    showIsActive: boolean = false,
    mappedFields: BasicDtoV1Equivalences<E> = <any>{
      id: 'id',
      name: 'name',
      description: 'description',
      is_active: 'auditableFields.is_active',
    },
  ): BasicDtoV1[] {
    return entities.map((entity) =>
      this.classToDtoV1(entity, showIsActive, mappedFields),
    );
  }
}

export interface BasicDtoV1Equivalences<E> {
  id?: keyof E;
  name?: keyof E;
  description?: keyof E;
  is_active?: keyof E;
}

export interface BasicDtoV2Equivalences<E>
  extends Omit<BasicDtoV1Equivalences<E>, 'id'> {
  code?: keyof E;
}
