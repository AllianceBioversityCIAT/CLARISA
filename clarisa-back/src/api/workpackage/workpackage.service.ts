import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateWorkpackageDto } from './dto/update-workpackage.dto';
import { WorkpackageDto } from './dto/workpackage.dto';
import { WorkpackageRepository } from './repositories/workpackage.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class WorkpackageService {
  constructor(private _workpackageRepository: WorkpackageRepository) {}

  async findAll(
    showWorkpackages: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    showInitiatives: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<WorkpackageDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(showWorkpackages)) {
      throw new BadParamsError(
        this._workpackageRepository.target.toString(),
        'showWorkpackages',
        showWorkpackages,
      );
    }

    if (!Object.values<string>(FindAllOptions).includes(showInitiatives)) {
      throw new BadParamsError(
        this._workpackageRepository.target.toString(),
        'showInitiatives',
        showInitiatives,
      );
    }

    return this._workpackageRepository.findWorkpackages(
      showWorkpackages,
      showInitiatives,
    );
  }

  async findOne(id: number): Promise<WorkpackageDto> {
    return this._workpackageRepository.findWorkpackageById(id).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._workpackageRepository.target.toString(),
        id,
      );
    });
  }

  async update(updateInitiativeDto: UpdateWorkpackageDto[]) {
    return await this._workpackageRepository.save(updateInitiativeDto);
  }
}
