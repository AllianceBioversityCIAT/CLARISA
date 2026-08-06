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
    // The payload is sanitised, never reshaped. This endpoint has no
    // validation pipe, so the body arrives exactly as the caller typed it:
    // `save()` accepts a single entity as well as an array, and it is the one
    // that decides what an empty or malformed body means. Normalising here
    // would change the answer a caller gets today without having changed
    // anything on its side, which is precisely what this change must not do.
    if (Array.isArray(updateInitiativeDto)) {
      return await this.institutionRepository.save(
        updateInitiativeDto.map((dto) => this._stripLifecycleFields(dto)),
      );
    }

    if (updateInitiativeDto && typeof updateInitiativeDto === 'object') {
      return await this.institutionRepository.save(
        this._stripLifecycleFields(updateInitiativeDto),
      );
    }

    // Anything else (an empty body, a scalar) reaches TypeORM untouched, so the
    // caller gets the very same error it gets today.
    return await this.institutionRepository.save(updateInitiativeDto as never);
  }

  /**
   * Copies the payload without its lifecycle fields, never writing a key that
   * has an inherited setter.
   *
   * `{ ...dto }` is not safe here: this project targets es2017, so TypeScript
   * emits it as `Object.assign`, which copies with `[[Set]]`. A body carrying
   * `"__proto__": { "end_date": "..." }` — which `JSON.parse` hands over as a
   * plain own property — then lands on the *prototype* of the copy, where
   * `delete` cannot reach it and where TypeORM, which resolves columns through
   * the prototype chain, reads it happily. That turned the sanitiser itself
   * into the way in for `end_date` through this unauthenticated endpoint.
   * Building the copy key by key with `defineProperty` keeps `[[Set]]` out of
   * the picture, and the prototype keys are dropped along with the lifecycle
   * ones. A caller sending none of them is unaffected.
   */
  private _stripLifecycleFields(dto: UpdateInstitutionDto) {
    const source = dto as unknown as Record<string, unknown>;
    const clean: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      if (InstitutionService.FORBIDDEN_FIELDS.has(key)) {
        continue;
      }

      Object.defineProperty(clean, key, {
        value: source[key],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    return clean;
  }

  private static readonly FORBIDDEN_FIELDS = new Set([
    // lifecycle: only `updateLifecycle` may write these
    'start_date',
    'end_date',
    'startDate',
    'endDate',
    'outgoing_lineages',
    'incoming_lineages',
    'replacedBy',
    'replaces',
    // prototype-chain keys: no payload gets to hide a column behind them
    '__proto__',
    'constructor',
    'prototype',
  ]);

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
