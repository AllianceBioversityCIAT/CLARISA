import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { ValidityStatusOptions } from '../../../shared/entities/enums/validity-status-options';
import { CountryOfficeRequest } from '../../country-office-request/entities/country-office-request.entity';
import { InstitutionDictionaryDto } from '../../institution-dictionary/dto/institution-dictionary.dto';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { InstitutionSimpleDto } from '../dto/institution-simple.dto';
import { InstitutionDto } from '../dto/institution.dto';
import { InstitutionLocation } from '../entities/institution-location.entity';
import { Institution } from '../entities/institution.entity';
import {
  InstitutionLineage,
  InstitutionLineageRelationType,
} from '../entities/institution-lineage.entity';
import { UpdateInstitutionLifecycleDto } from '../dto/update-institution-lifecycle.dto';
import { InstitutionLocationRepository } from './institution-location.repository';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ElasticFindEntity } from '../../../integration/opensearch/dto/elastic-find-entity.dto';

@Injectable()
export class InstitutionRepository
  extends Repository<Institution>
  implements ElasticFindEntity<InstitutionDto>
{
  /**
   * Validity period, formatted in SQL so the value does not depend on how the
   * driver serialises a DATE. `endDate` NULL means the institution is still
   * valid and consumable; a date means it must no longer be used.
   * `validityStatus` is a string and not a boolean on purpose: a boolean has
   * exactly two states forever, and the day a third one is needed the only
   * options are a second field or a breaking change.
   */
  private static readonly VALIDITY_SELECT_FRAGMENT = `
        date_format(i.start_date, '%Y-%m-%d') startDate,
        date_format(i.end_date, '%Y-%m-%d') endDate,
        case when i.end_date is null then 'active' else 'ended' end validityStatus`;

  /**
   * Lineage, resolved one hop only. Correlated subqueries rather than joins so
   * the outer `group by i.id` keeps counting one row per institution.
   * `json_arrayagg` returns NULL and not an empty array when it matches no
   * rows, hence the coalesce: these arrays must never be null.
   *
   * `previousAcronyms` and `previousNames` are lookup sets, NOT two columns of
   * the same table: a predecessor with no acronym contributes a name and no
   * acronym, so the two arrays can have different lengths and index `n` of one
   * does not belong to index `n` of the other. `json_arrayagg` also does not
   * accept ORDER BY in MySQL 8, so neither array has a guaranteed order. Use
   * `replaces` whenever a name has to be paired with its acronym.
   */
  private static readonly LINEAGE_SELECT_FRAGMENT = `
        coalesce((
          select json_arrayagg(json_object(
            "code", succ.id,
            "name", succ.name,
            "acronym", succ.acronym,
            "relationType", edge_out.relation_type,
            "changeDate", date_format(edge_out.change_date, '%Y-%m-%d')
          ))
          from institution_lineage edge_out
          join institutions succ on succ.id = edge_out.to_institution_id
          where edge_out.from_institution_id = i.id
        ), json_array()) replacedBy,
        coalesce((
          select json_arrayagg(json_object(
            "code", pred.id,
            "name", pred.name,
            "acronym", pred.acronym,
            "relationType", edge_in.relation_type,
            "changeDate", date_format(edge_in.change_date, '%Y-%m-%d')
          ))
          from institution_lineage edge_in
          join institutions pred on pred.id = edge_in.from_institution_id
          where edge_in.to_institution_id = i.id
        ), json_array()) \`replaces\`,
        coalesce((
          select json_arrayagg(pred_a.acronym)
          from institution_lineage edge_a
          join institutions pred_a on pred_a.id = edge_a.from_institution_id
          where edge_a.to_institution_id = i.id
            and pred_a.acronym is not null and pred_a.acronym <> ''
        ), json_array()) previousAcronyms,
        coalesce((
          select json_arrayagg(pred_n.name)
          from institution_lineage edge_n
          join institutions pred_n on pred_n.id = edge_n.from_institution_id
          where edge_n.to_institution_id = i.id
        ), json_array()) previousNames`;

  constructor(
    private dataSource: DataSource,
    private institutionLocationRepository: InstitutionLocationRepository,
  ) {
    super(Institution, dataSource.createEntityManager());
  }

  async findDataForOpenSearch(
    option: FindAllOptions,
    ids?: number[],
  ): Promise<InstitutionDto[]> {
    return this.findInstitutions(option, undefined, ids);
  }

  async findInstitutions(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: number = undefined,
    institutionIds?: number[],
    validityStatus: ValidityStatusOptions = ValidityStatusOptions.SHOW_ALL,
  ): Promise<InstitutionDto[]> {
    let whereClause: string = '';
    const whereValues: (string | number)[] = [];

    if (from) {
      whereClause += `where i.updated_at >= FROM_UNIXTIME(? / 1000, '%Y-%m-%d %H:%i:%s.%f')`;
      whereValues.push(from);
    }

    if (institutionIds) {
      whereClause += `${whereClause ? ' and' : 'where'} i.id in (?)`;
      whereValues.push(institutionIds.join(','));
    }

    whereClause += `${whereClause ? ' and' : 'where'} i.is_active in (?)`;
    let valueToPush: string;

    if (option === FindAllOptions.SHOW_ALL) {
      valueToPush = '1,0';
    } else if (option === FindAllOptions.SHOW_ONLY_ACTIVE) {
      valueToPush = '1';
    } else {
      valueToPush = '0';
    }

    whereValues.push(valueToPush);

    // Additive and opt-in. The default (SHOW_ALL) adds nothing to the clause,
    // so a caller that sends no `status` gets the exact same rows as today.
    if (validityStatus === ValidityStatusOptions.SHOW_ONLY_ACTIVE) {
      whereClause += ' and i.end_date is null';
    } else if (validityStatus === ValidityStatusOptions.SHOW_ONLY_ENDED) {
      whereClause += ' and i.end_date is not null';
    }

    const query: string = `
      select i.id code, i.name, i.acronym, i.website_link websiteLink,
        i.created_at added, ${option !== FindAllOptions.SHOW_ONLY_ACTIVE ? 'i.is_active,' : ''}
        ${InstitutionRepository.VALIDITY_SELECT_FRAGMENT},
        ${InstitutionRepository.LINEAGE_SELECT_FRAGMENT},
        json_arrayagg(json_object(
          "regionDTO", null,
          "code", il.id,
          "isHeadquarter", il.is_headquater,
          "isoAlpha2", c.iso_alpha_2,
          "name", c.name
        )) countryOfficeDTO, json_object(
          "code", it.id,
          "name", it.name
        ) institutionType
      from institutions i
      left join institution_locations il on il.institution_id = i.id and il.is_active
      left join countries c on il.country_id = c.id
      left join institution_types it on i.institution_type_id = it.id
      ${whereClause}
      group by i.id
    `;

    return await this.query(query, whereValues).catch((error) => {
      throw Error(`Error fetching institutions: ${error}`);
    });
  }

  async findInstitutionById(id: number): Promise<InstitutionDto> {
    return this.findInstitutions(FindAllOptions.SHOW_ALL, undefined, [id]).then(
      (value) => (value ? value[0] : null),
    );
  }

  private _getQueryForInstitutionSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    addInstitutionRelated: boolean = false,
    institutionId?: number,
  ) {
    let whereClause: string = '';
    if (institutionId) {
      whereClause += `where i.id = ?`;
    }

    whereClause += `${whereClause ? ' and' : 'where'} i.is_active in (?)`;

    return `
      select i.id as code, i.acronym, c.name as hqLocation, c.iso_alpha_2 as hqLocationISOalpha2,
        ${option !== FindAllOptions.SHOW_ONLY_ACTIVE ? 'i.is_active,' : ''}
        ${InstitutionRepository.VALIDITY_SELECT_FRAGMENT},
        it.name as institutionType, it.id as institutionTypeId, i.name, i.website_link as websiteLink
        ${
          addInstitutionRelated
            ? `,
          (
            select json_arrayagg(json_object(
              "source", s_q1.name,
              "institutionCode", id_q1.institution_source_id,
              "institutionName", id_q1.institution_source_name
            ))
            from institution_dictionary id_q1
            join sources s_q1 on id_q1.source_id = s_q1.id and s_q1.is_active
            where id_q1.is_active and id_q1.institution_id = i.id
          ) as institutionRelatedList
           `
            : ''
        }
        from institutions i
        left join institution_locations il on il.institution_id = i.id and il.is_active and il.is_headquater 
        left join countries c on il.country_id = c.id
        left join institution_types it on i.institution_type_id = it.id
        ${whereClause}
    `;
  }

  async findInstitutionSourceEntries(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    institutionId?: number,
  ): Promise<InstitutionDictionaryDto[]> {
    const whereValues: (string | number)[] = [];
    if (institutionId) {
      whereValues.push(institutionId);
    }

    let valueToPush: string;

    if (option === FindAllOptions.SHOW_ALL) {
      valueToPush = '1,0';
    } else if (option === FindAllOptions.SHOW_ONLY_ACTIVE) {
      valueToPush = '1';
    } else {
      valueToPush = '0';
    }

    whereValues.push(valueToPush);

    return await this.query(
      this._getQueryForInstitutionSimple(option, true),
      whereValues,
    ).catch((error) => {
      throw Error(`Error fetching simple old institutions: ${error}`);
    });
  }

  async findInstitutionSourceEntriesById(
    id: number,
  ): Promise<InstitutionDictionaryDto> {
    return this.findInstitutionSourceEntries(FindAllOptions.SHOW_ALL, id).then(
      (value) => (value ? value[0] : null),
    );
  }

  async findAllInstitutionsSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    institutionId?: number,
  ): Promise<InstitutionSimpleDto[]> {
    const whereValues: (string | number)[] = [];

    if (institutionId) {
      whereValues.push(institutionId);
    }

    whereValues.push(
      option === FindAllOptions.SHOW_ALL
        ? '1,0'
        : option === FindAllOptions.SHOW_ONLY_ACTIVE
          ? '1'
          : '0',
    );

    return await this.query(
      this._getQueryForInstitutionSimple(option),
      whereValues,
    ).catch((error) => {
      throw Error(`Error fetching simple institutions: ${error}`);
    });
  }

  async findInstitutionSimpleById(id: number): Promise<InstitutionSimpleDto> {
    return this.findAllInstitutionsSimple(FindAllOptions.SHOW_ALL, id).then(
      (value) => (value ? value[0] : null),
    );
  }

  async createInstitutionCountry(
    request: CountryOfficeRequest | PartnerRequest,
    isHQ: boolean,
  ): Promise<InstitutionLocation> {
    const institutionLocation: InstitutionLocation = new InstitutionLocation();
    institutionLocation.auditableFields = new AuditableEntity();

    institutionLocation.country_id = request.country_id;
    institutionLocation.institution_id = request.institution_id;
    institutionLocation.is_headquater = isHQ;
    institutionLocation.auditableFields.created_at = request.accepted_date;
    institutionLocation.auditableFields.created_by = request.accepted_by;

    return this.institutionLocationRepository.save(institutionLocation);
  }

  async createInstitution(
    partnerRequest: PartnerRequest,
  ): Promise<InstitutionDto> {
    let institution: Institution = new Institution();
    institution.auditableFields = new AuditableEntity();

    institution.acronym = partnerRequest.acronym;
    institution.name = partnerRequest.partner_name;
    institution.website_link = partnerRequest.web_page;
    institution.institution_type_id = partnerRequest.institution_type_id;
    institution.auditableFields.created_at = partnerRequest.accepted_date;
    institution.auditableFields.created_by = partnerRequest.accepted_by;

    institution = await this.save(institution);
    partnerRequest.institution_id = institution.id;

    await this.createInstitutionCountry(partnerRequest, true);

    return this.findInstitutionById(institution.id);
  }

  private async _createInstitutionCountryBulk(
    entityManager: EntityManager,
    countryAndInstitution: number,
    id_institution: number,
    isHQ: boolean,
    createBy: number,
  ) {
    const institutionLocation: InstitutionLocation = new InstitutionLocation();
    institutionLocation.auditableFields = new AuditableEntity();

    institutionLocation.country_id = countryAndInstitution;
    institutionLocation.is_headquater = isHQ;
    institutionLocation.institution_id = id_institution;
    institutionLocation.auditableFields.created_by = createBy;

    return entityManager.save(institutionLocation);
  }

  async createBulkInstitution(
    entityManager: EntityManager,
    BulkInstitutions: PartnerRequest,
    createBy: number,
  ) {
    let institution: Institution = new Institution();
    institution.auditableFields = new AuditableEntity();

    institution.acronym = BulkInstitutions.acronym;
    institution.name = BulkInstitutions.partner_name;
    institution.website_link = BulkInstitutions.web_page;

    institution.institution_type_id = BulkInstitutions.institution_type_id;
    institution.auditableFields.created_by = createBy;
    institution = await entityManager.save(institution);
    await this._createInstitutionCountryBulk(
      entityManager,
      BulkInstitutions.country_id,
      institution.id,
      true,
      createBy,
    );

    return institution;
  }

  /**
   * Writes the validity period and, optionally, the succession edge.
   *
   * Both writes happen in one transaction: an institution retired without its
   * successor is a legitimate state, but a successor recorded without the
   * retirement date would publish a contradiction and is rejected. Reviving
   * (`endDate: null`) drops the succession edges for the same reason, and an
   * explicit `replacedByInstitutionId: null` drops them on their own.
   * Re-sending the successor already recorded rewrites that edge in place
   * rather than failing, so the relation type, the change date and the note
   * remain correctable. `updated_at` is bumped explicitly on every institution
   * whose published record changed, so PRMS's incremental sync (`?from=`) picks
   * them all up.
   */
  async updateLifecycle(
    id: number,
    dto: UpdateInstitutionLifecycleDto,
    userId: number,
  ): Promise<InstitutionDto> {
    const institution = await this.findOne({ where: { id } });
    if (!institution) {
      throw new NotFoundException(`Institution with id '${id}' was not found`);
    }

    /** edges already leaving this institution, read once for the guards below */
    let outgoingEdges: InstitutionLineage[] = [];

    if (dto.replacedByInstitutionId != null) {
      // Compared numerically, not with ===. The id comes from the URL as a
      // number but the body is only coerced when a ValidationPipe is in front
      // of the handler; a string '221' would slip past a strict comparison and
      // create a self-loop that no consumer resolving a rename chain can exit.
      if (Number(dto.replacedByInstitutionId) === Number(id)) {
        throw new BadRequestException(
          'An institution cannot replace itself. Pick a different successor.',
        );
      }

      // A successor is only meaningful once the institution stops being
      // consumable. Publishing `validityStatus: 'active'` next to a non-empty
      // `replacedBy` leaves PRMS, MEL, MARLO and STAR without a rule: either
      // they keep offering an institution that already declares its own
      // replacement, or they hide one that is still valid. The date being
      // written in this same call counts; so does one written earlier.
      const resultingEndDate =
        dto.endDate !== undefined ? dto.endDate : institution.end_date;
      if (resultingEndDate == null || resultingEndDate === '') {
        throw new BadRequestException(
          'A successor can only be recorded together with an end date. Send `endDate` in this same request, or retire the institution first.',
        );
      }

      const successor = await this.findOne({
        where: { id: dto.replacedByInstitutionId },
      });
      if (!successor) {
        throw new NotFoundException(
          `The successor institution with id '${dto.replacedByInstitutionId}' was not found`,
        );
      }

      // Only the tip of a chain may be replaced. Without this, approving the
      // same replacement twice, or replacing an already-retired institution,
      // silently produces a fork that no consumer can resolve.
      if (successor.end_date != null) {
        throw new BadRequestException(
          `Institution '${dto.replacedByInstitutionId}' is itself retired (end date ${successor.end_date}). Point at the institution that is currently valid.`,
        );
      }

      // `is_active` is the platform's logical delete and stays untouched by
      // this endpoint, but pointing consumers at a logically deleted row is the
      // same mistake as pointing them at a retired one: the default
      // `GET /api/institutions` does not return it, so `replacedBy` would name
      // an institution absent from the very catalogue the consumer holds.
      const successorIsActive = successor.auditableFields?.is_active;
      if (successorIsActive !== undefined && !successorIsActive) {
        throw new BadRequestException(
          `Institution '${dto.replacedByInstitutionId}' is not active. Point at an institution consumers can still see.`,
        );
      }

      // Only the successor an institution does NOT have yet is a conflict.
      // Re-sending the one already recorded is how the admin panel corrects the
      // relation type, the change date or the note of an existing edge — and it
      // is what its dialog sends verbatim when it is reopened on a row that is
      // already linked, so rejecting it would make the panel unable to save any
      // institution it had already retired.
      outgoingEdges = await this.manager.find(InstitutionLineage, {
        where: { from_institution_id: id },
      });
      const conflicting = outgoingEdges.filter(
        (edge) =>
          Number(edge.to_institution_id) !==
          Number(dto.replacedByInstitutionId),
      );
      if (conflicting.length) {
        throw new BadRequestException(
          `Institution '${id}' already has a successor recorded. Remove the existing lineage edge before recording a new one.`,
        );
      }
    }

    await this.manager.transaction(async (entityManager) => {
      // Raw UPDATE on purpose. The audit columns live inside the embedded
      // `AuditableEntity` with an empty prefix, so the query builder does not
      // resolve them as plain properties, and `updated_at` has to be bumped
      // explicitly anyway: PRMS syncs incrementally with `?from=`, and a row
      // whose timestamp did not move is never picked up.
      const assignments: string[] = [
        'updated_at = CURRENT_TIMESTAMP(6)',
        'updated_by = ?',
      ];
      const params: unknown[] = [userId ?? null];

      if (dto.startDate !== undefined) {
        assignments.push('start_date = ?');
        params.push(dto.startDate);
      }
      if (dto.endDate !== undefined) {
        assignments.push('end_date = ?');
        params.push(dto.endDate);
      }
      if (dto.note) {
        assignments.push('modification_justification = ?');
        params.push(dto.note);
      }

      params.push(id);
      await entityManager.query(
        `UPDATE institutions SET ${assignments.join(', ')} WHERE id = ?`,
        params,
      );

      // Reviving is the undo of retiring, so it has to undo the succession as
      // well. An institution back in service that still declares who replaced
      // it publishes the very contradiction guarded against above, with a
      // `changeDate` pointing at a retirement that no longer exists, and the
      // surviving edge would trip the conflict guard forever, leaving it
      // impossible to retire again towards a different successor.
      //
      // An explicit `replacedByInstitutionId: null` removes the succession on
      // its own, without reviving: a wrong successor has to be undoable, and
      // the alternative — revive, then retire again — rewrites the end date and
      // republishes the institution as valid in between.
      if (dto.endDate === null || dto.replacedByInstitutionId === null) {
        const edgesToDrop: InstitutionLineage[] = await entityManager.find(
          InstitutionLineage,
          { where: { from_institution_id: id } },
        );

        if (edgesToDrop.length) {
          await entityManager.delete(InstitutionLineage, {
            from_institution_id: id,
          });

          // Same reason as when the edge is created: the successors' published
          // `replaces`, `previousAcronyms` and `previousNames` just changed, so
          // an incremental `?from=` sync has to see them.
          const successorIds = edgesToDrop.map(
            (edge) => edge.to_institution_id,
          );
          await entityManager.query(
            `UPDATE institutions SET updated_at = CURRENT_TIMESTAMP(6) WHERE id in (${successorIds
              .map(() => '?')
              .join(', ')})`,
            successorIds,
          );
        }
      }

      if (dto.replacedByInstitutionId != null) {
        // Reuses the row when the same succession is being re-sent, so its id
        // and `created_at` survive a correction of the relation type, the
        // change date or the note.
        const edge =
          outgoingEdges.find(
            (existing) =>
              Number(existing.to_institution_id) ===
              Number(dto.replacedByInstitutionId),
          ) ?? new InstitutionLineage();
        edge.from_institution_id = id;
        edge.to_institution_id = dto.replacedByInstitutionId;
        edge.relation_type =
          dto.relationType ?? InstitutionLineageRelationType.RENAME;
        // Falls back to the stored end date for the two-step flow (retire now,
        // link the successor later): the guard above proves one of the three is
        // set, so the edge is never left without a date.
        edge.change_date =
          dto.changeDate ?? dto.endDate ?? institution.end_date ?? null;
        edge.note = dto.note ?? edge.note ?? null;
        edge.created_by = edge.created_by ?? userId;

        await entityManager.save(InstitutionLineage, edge);

        // The successor's published record changes too: `replaces`,
        // `previousAcronyms` and `previousNames` are all derived from this new
        // edge. Its own `updated_at` is bumped so PRMS's incremental sync
        // (`?from=`) picks it up; otherwise consumers keep a stale successor
        // with an empty lineage, which is precisely the record they need in
        // order to resolve the retired one.
        await entityManager.query(
          `UPDATE institutions SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?`,
          [dto.replacedByInstitutionId],
        );
      }
    });

    return this.findInstitutionById(id);
  }
}
