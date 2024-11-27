import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CountryOfficeRequestDto } from '../dto/country-office-request.dto';
import { CreateCountryOfficeRequestDto } from '../dto/create-country-office-request.dto';
import { RespondRequestDto } from '../../../shared/entities/dtos/respond-request.dto';
import { CountryOfficeRequest } from '../entities/country-office-request.entity';
import { UpdateCountryOfficeRequestDto } from '../dto/update-country-office-request.dto';
import { InstitutionRepository } from '../../institution/repositories/institution.repository';
import { MisOption } from '../../../shared/entities/enums/mises-options';
import { PartnerStatus } from '../../../shared/entities/enums/partner-status';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';

@Injectable()
//TODO create email template for the email to be sent to the user when a country office request is created, accepted or rejected
export class CountryOfficeRequestRepository extends Repository<CountryOfficeRequest> {
  constructor(
    private dataSource: DataSource,
    private institutionRepository: InstitutionRepository,
  ) {
    super(CountryOfficeRequest, dataSource.createEntityManager());
  }

  async findCountryOfficeRequestById(
    id: number,
  ): Promise<CountryOfficeRequestDto> {
    return this.findCountryOfficeRequests(
      PartnerStatus.ALL.path,
      MisOption.ALL.path,
      [id],
    ).then((res) => {
      if (res?.length === 0) {
        throw Error();
      }

      return res[0];
    });
  }

  async findCountryOfficeRequests(
    status: string = PartnerStatus.PENDING.path,
    mis: string = MisOption.ALL.path,
    requestIds?: number[],
  ): Promise<CountryOfficeRequestDto[]> {
    const incomingMis = MisOption.getfromPath(mis);
    let whereClause: string = '';
    const whereValues: (string | number)[] = [];

    switch (mis) {
      case MisOption.ALL.path:
        // do nothing. no extra conditions needed
        break;
      case MisOption.AICCRA.path:
      case MisOption.CGSPACE.path:
      case MisOption.CLARISA.path:
      case MisOption.ECONTRACTS.path:
      case MisOption.FORESIGHT.path:
      case MisOption.MEL.path:
      case MisOption.OST.path:
      case MisOption.TOC.path:
      case MisOption.PRMS.path:
      case MisOption.MARLO.path:
      case MisOption.PIPELINE.path:
        whereClause = 'where mis_id = ?';
        whereValues.push(incomingMis.mis_id);
        break;
    }

    switch (status) {
      case PartnerStatus.ALL.path:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case PartnerStatus.PENDING.path:
        whereClause += `${!whereClause ? 'where' : ' and'} accepted_by is null and rejected_by is null`;
        break;
      case PartnerStatus.ACCEPTED.path:
      case PartnerStatus.REJECTED.path:
        whereClause += `${!whereClause ? 'where' : ' and'} accepted_by is ${status === PartnerStatus.ACCEPTED.path ? 'not null' : 'null'} and rejected_by is ${status === PartnerStatus.REJECTED.path ? 'not null' : 'null'}`;
        break;
    }

    if (requestIds) {
      const idPlaceholders = requestIds.map(() => '?').join(', ');
      whereClause += `${!whereClause ? 'where' : ' and'} cor.id in (${idPlaceholders})`;
      whereValues.push(...requestIds);
    }

    const query: string = `
      select cor.id, (
        case 
          when cor.accepted_by is null and cor.rejected_by is null then 'Pending'
          when cor.accepted_by is not null then 'Accepted'
          when cor.rejected_by is not null then 'Rejected'
          else 'Unknown'
        end
      ) as requestStatus,
      cor.reject_justification as rejectJustification, cor.request_source as requestSource,
      cor.external_user_mail as externalUserMail, cor.external_user_name as externalUserName,
      cor.external_user_comments as externalUserComments, json_object(
        "code", c.id,
        "isoAlpha2", c.iso_alpha_2,
        "isoAlpha3", c.iso_alpha_3,
        "name", c.name,
        "regionDTO", (
          select json_object(
            "name", r.name,
            "um49Code", r.iso_numeric
          )
          from country_regions cr
          right join regions r on r.region_type_id = 1 
            and r.id = cr.region_id and r.is_active
          where cr.country_id = c.id and cr.is_active
        )
      ) as countryDTO, json_object("code", cor.institution_id) as institutionDTO
      from country_office_requests cor
      left join countries c on cor.country_id = c.id
      ${whereClause}
    `;

    return this.query(query, whereValues).then(
      (cors: CountryOfficeRequestDto[]) => {
        if (cors.length === 0) {
          return [];
        }

        return this.institutionRepository
          .findInstitutions(
            FindAllOptions.SHOW_ONLY_ACTIVE,
            undefined,
            cors.map((c) => c.institutionDTO.code),
          )
          .then((insts) => {
            return cors.map((cor) => {
              cor.institutionDTO = insts.find(
                (i) => i.code === cor.institutionDTO.code,
              );
              return cor;
            });
          });
      },
    );
  }

  async createCountryOfficeRequest(
    incomingCountryOfficeRequest: CreateCountryOfficeRequestDto,
    partialCountryOfficeRequests: CountryOfficeRequest[],
  ): Promise<CountryOfficeRequestDto[]> {
    return this.dataSource
      .transaction(async (manager) => {
        for (let partialCor of partialCountryOfficeRequests) {
          partialCor.request_source =
            incomingCountryOfficeRequest.requestSource;
          partialCor.external_user_mail =
            incomingCountryOfficeRequest.externalUserMail;
          partialCor.external_user_name =
            incomingCountryOfficeRequest.externalUserName;
          partialCor.external_user_comments =
            incomingCountryOfficeRequest.externalUserComments;

          partialCor.country_id = partialCor.country_object.id;
          partialCor.mis_id = partialCor.mis_object.id;

          partialCor.auditableFields.created_by =
            partialCor.auditableFields.created_by_object.id;

          partialCor = await manager.save(partialCor);
        }

        return partialCountryOfficeRequests;
      })
      .then((cors) => {
        return this.findCountryOfficeRequests(
          PartnerStatus.PENDING.path,
          MisOption.ALL.path,
          cors.map((cor) => cor.id),
        );
      });
  }

  async respondCountryOfficeRequest(
    partialCountryOfficeRequest: CountryOfficeRequest,
    respondCountryOfficeRequestDto: RespondRequestDto,
  ): Promise<CountryOfficeRequestDto> {
    partialCountryOfficeRequest.auditableFields.is_active = false;
    partialCountryOfficeRequest.external_user_mail =
      respondCountryOfficeRequestDto.externalUserMail;
    partialCountryOfficeRequest.external_user_name =
      respondCountryOfficeRequestDto.externalUserName;
    partialCountryOfficeRequest.external_user_comments =
      respondCountryOfficeRequestDto.externalUserComments;

    const accepted = respondCountryOfficeRequestDto.accept;

    partialCountryOfficeRequest.auditableFields.modification_justification =
      accepted
        ? `Accepted on ${partialCountryOfficeRequest.accepted_date.toISOString()}`
        : respondCountryOfficeRequestDto.rejectJustification;

    partialCountryOfficeRequest.auditableFields.updated_by = accepted
      ? partialCountryOfficeRequest.accepted_by
      : partialCountryOfficeRequest.rejected_by;

    partialCountryOfficeRequest = await this.save(partialCountryOfficeRequest);

    await this.institutionRepository.createInstitutionCountry(
      partialCountryOfficeRequest,
      false,
    );

    return this.findCountryOfficeRequestById(partialCountryOfficeRequest.id);
  }

  async updateCountryOfficeRequest(
    updateCountryOfficeRequest: UpdateCountryOfficeRequestDto,
    countryOfficeRequest: CountryOfficeRequest,
  ): Promise<CountryOfficeRequestDto> {
    countryOfficeRequest.country_id = countryOfficeRequest.country_object.id;

    countryOfficeRequest.auditableFields.updated_by =
      countryOfficeRequest.auditableFields.updated_by_object.id;
    countryOfficeRequest.auditableFields.modification_justification =
      updateCountryOfficeRequest.modificationJustification;

    countryOfficeRequest = await this.save(countryOfficeRequest);

    return this.findCountryOfficeRequestById(countryOfficeRequest.id);
  }
}
