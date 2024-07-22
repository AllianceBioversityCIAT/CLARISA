import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateWorkpackageDto } from './dto/update-workpackage.dto';
import { WorkpackageDto } from './dto/workpackage.dto';
import { WorkpackageRepository } from './repositories/workpackage.repository';

@Injectable()
export class WorkpackageService {
  constructor(private workpackageRepository: WorkpackageRepository) {}

  async findAll(
    showWorkpackages: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    showInitiatives: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<WorkpackageDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(showWorkpackages)) {
      throw Error('?!');
    }

    if (!Object.values<string>(FindAllOptions).includes(showInitiatives)) {
      throw Error('?!');
    }

    return this.workpackageRepository.findWorkpackages(
      showWorkpackages,
      showInitiatives,
    );
  }

  async findOne(id: number): Promise<WorkpackageDto> {
    const result = await this.workpackageRepository.findWorkpackages(
      FindAllOptions.SHOW_ONLY_ACTIVE,
      FindAllOptions.SHOW_ONLY_ACTIVE,
      id,
    );

    return result.length === 1 ? result[0] : null;
  }

  async update(updateInitiativeDto: UpdateWorkpackageDto[]) {
    return await this.workpackageRepository.save(updateInitiativeDto);
  }
}
