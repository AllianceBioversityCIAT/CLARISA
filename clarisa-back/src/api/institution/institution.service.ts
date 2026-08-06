import { BadRequestException, Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ValidityStatusOptions } from '../../shared/entities/enums/validity-status-options';
import { InstitutionSimpleDto } from './dto/institution-simple.dto';
import { InstitutionDto } from './dto/institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateInstitutionLifecycleDto } from './dto/update-institution-lifecycle.dto';
import { InstitutionRepository } from './repositories/institution.repository';

@Injectable()
export class InstitutionService {
  constructor(private institutionRepository: InstitutionRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: number = undefined,
    status: ValidityStatusOptions = ValidityStatusOptions.SHOW_ALL,
  ): Promise<InstitutionDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    // An unknown value is rejected rather than silently ignored: a consumer
    // that misspells the filter must not receive a full list believing it was
    // filtered.
    if (!Object.values<string>(ValidityStatusOptions).includes(status)) {
      throw new BadRequestException(
        `Unknown status '${status}'. Valid values are: ${Object.values(
          ValidityStatusOptions,
        ).join(', ')}.`,
      );
    }

    if (from != null && Number.isNaN(from)) {
      throw Error('?!');
    } else {
      return this.institutionRepository.findInstitutions(
        option,
        from,
        undefined,
        status,
      );
    }
  }

  async findAllSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InstitutionSimpleDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.institutionRepository.findAllInstitutionsSimple(option);
  }

  async findOne(id: number): Promise<InstitutionDto> {
    return this.institutionRepository.findInstitutionById(id);
  }

  async findOneSimple(id: number): Promise<InstitutionSimpleDto> {
    return this.institutionRepository.findInstitutionSimpleById(id);
  }

  /**
   * Bulk edit. This endpoint is not authenticated today, so lifecycle fields
   * are stripped from the payload before anything reaches the database: being
   * able to edit a label is not the same as being able to switch off an
   * institution that the whole CGIAR reports against. Lifecycle changes go
   * through `updateLifecycle`, which is guarded.
   */
  async update(updateInitiativeDto: UpdateInstitutionDto[]) {
    const sanitised = (updateInitiativeDto ?? []).map((dto) => {
      const clean = { ...dto } as Record<string, unknown>;
      for (const forbidden of InstitutionService.LIFECYCLE_FIELDS) {
        delete clean[forbidden];
      }
      return clean;
    });

    return await this.institutionRepository.save(sanitised);
  }

  private static readonly LIFECYCLE_FIELDS = [
    'start_date',
    'end_date',
    'startDate',
    'endDate',
    'outgoing_lineages',
    'incoming_lineages',
    'replacedBy',
    'replaces',
  ];

  /**
   * Retire an institution and optionally link it to its successor.
   * The date and the edge are written in a single transaction: a retired
   * institution with no successor is a valid state, but a successor recorded
   * without the retirement date is not.
   */
  async updateLifecycle(
    id: number,
    dto: UpdateInstitutionLifecycleDto,
    userId: number,
  ): Promise<InstitutionDto> {
    return this.institutionRepository.updateLifecycle(id, dto, userId);
  }
}
