import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RespondRequestDto } from '../../../shared/entities/dtos/respond-request.dto';
import { MisOption } from '../../../shared/entities/enums/mises-options';
import { PartnerStatus } from '../../../shared/entities/enums/partner-status';
import { Country } from '../../country/entities/country.entity';
import { InstitutionRepository } from '../../institution/repositories/institution.repository';
import { CreatePartnerRequestDto } from '../dto/create-partner-request.dto';
import { PartnerRequestDto } from '../dto/partner-request.dto';
import { UpdatePartnerRequestDto } from '../dto/update-partner-request.dto';
import { PartnerRequest } from '../entities/partner-request.entity';
import { InstitutionType } from '../../institution-type/entities/institution-type.entity';
import { CountryRepository } from '../../country/repositories/country.repository';
import { InstitutionTypeRepository } from '../../institution-type/repositories/institution-type.repository';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { PartnerStatsDto } from '../dto/partner-stats.dto';
import { StringContentComparator } from '../../../shared/utils/string-content-comparator';
import { ResponseDto } from '../../../shared/entities/dtos/response.dto';
import { BulkPartnerRequestDto } from '../dto/create-partner-dto';
import { MessagingMicroservice } from '../../../integration/microservices/messaging/messaging.microservice';
import { EmailTemplate } from '../../../integration/microservices/messaging/dto/email-cases';

@Injectable()
export class PartnerRequestRepository extends Repository<PartnerRequest> {
  constructor(
    private dataSource: DataSource,
    private institutionRepository: InstitutionRepository,
    private countryRepository: CountryRepository,
    private institutionType: InstitutionTypeRepository,
    private messageMicroservice: MessagingMicroservice,
  ) {
    super(PartnerRequest, dataSource.createEntityManager());
  }

  async findPartnerRequests(
    status: string = PartnerStatus.PENDING.path,
    mis: string = MisOption.ALL.path,
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    requestIds?: number[],
  ): Promise<PartnerRequestDto[]> {
    const incomingMis = MisOption.getfromPath(mis);

    let whereClause: string = 'where pr.partner_request_id is not null';
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
        whereClause = ' and pr.mis_id = ?';
        whereValues.push(incomingMis.mis_id);
        break;
    }

    switch (status) {
      case PartnerStatus.ALL.path:
        //do nothing. we will be showing everything, so no condition is needed
        break;
      case PartnerStatus.PENDING.path:
        whereClause += ' and pr.accepted_by is null and pr.rejected_by is null';
        break;
      case PartnerStatus.ACCEPTED.path:
      case PartnerStatus.REJECTED.path:
        whereClause += ` and (pr.accepted_by is ${status === PartnerStatus.ACCEPTED.path ? 'not null' : 'null'} and pr.rejected_by is ${status === PartnerStatus.REJECTED.path ? 'not null' : 'null'})`;
        break;
    }

    switch (show) {
      case FindAllOptions.SHOW_ALL:
        ///do nothing. we will be showing everything, so no condition is needed
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause += ` and pr.is_active = ${show === FindAllOptions.SHOW_ONLY_ACTIVE}`;
    }

    if (requestIds) {
      const idPlaceholders = requestIds.map(() => '?').join(', ');
      whereClause += ` and pr.id in (${idPlaceholders})`;
      whereValues.push(...requestIds);
    }

    const query = `
      select pr.id, pr.partner_name as partnerName, pr.acronym, pr.web_page as webPage,
        m.acronym as mis, (
          case 
            when pr.accepted_by is null and pr.rejected_by is null then 'Pending'
                when pr.accepted_by is not null then 'Accepted'
                when pr.rejected_by is not null then 'Rejected'
                else 'Unknown'
          end
        ) as requestStatus,
        m.acronym as misAcronym, pr.platform_url as platformUrl,
        pr.reject_justification as requestJustification, pr.request_source as requestSource,
        pr.external_user_mail as externalUserMail, pr.external_user_name as externalUserName,
        pr.external_user_comments as externalUserComments, pr.category_1, pr.category_2, 
        pr.created_at as created_at, 
        json_object(
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
        ) as countryDTO,
        json_object(
          "code", it.id,
          "name", it.name,
          "id_parent", it.parent_id
        ) as institutionTypeDTO,
        json_object("code", pr.institution_id) as institutionDTO
      from partner_requests pr
      left join mises m on pr.mis_id = m.id
      left join countries c on pr.country_id = c.id
      left join institution_types it on pr.institution_type_id = it.id
      ${whereClause}
    `;

    return this.query(query, whereValues).then((pr: PartnerRequestDto[]) => {
      if (pr.length === 0) {
        return [];
      }

      return this.institutionRepository
        .findInstitutions(
          FindAllOptions.SHOW_ONLY_ACTIVE,
          undefined,
          pr.map((c) => c.institutionDTO.code ?? 0),
        )
        .then((insts) => {
          return pr.map((cor) => {
            cor.institutionDTO = insts.find(
              (i) => i.code === cor.institutionDTO.code,
            );
            return cor;
          });
        });
    });
  }

  async findPartnerRequestById(
    id: number,
    forAcceptedPr: boolean = false,
  ): Promise<PartnerRequestDto> {
    return this.findPartnerRequests(
      PartnerStatus.ALL.path,
      MisOption.ALL.path,
      forAcceptedPr
        ? FindAllOptions.SHOW_ONLY_INACTIVE
        : FindAllOptions.SHOW_ONLY_ACTIVE,
      [id],
    ).then((res) => {
      if (res?.length === 0) {
        throw Error();
      }

      return res[0];
    });
  }

  async partnerStatistics(mis: string = MisOption.ALL.path) {
    const query = `
      select 
        count(pr.id) as total,
        sum(case when pr.accepted = 0 then 1 else 0 end) as rejected,
        sum(case when pr.accepted = 1 then 1 else 0 end) as accepted,
        sum(case when pr.accepted is null then 1 else 0 end) as pending
      from partner_requests pr
      where pr.partner_request_id is not null
      ${mis !== MisOption.ALL.path ? `and pr.mis_id = '${mis}'` : ''}
    `;

    return this.query(query) as Promise<PartnerStatsDto>;
  }

  async createPartnerRequest(
    incomingPartnerRequest: CreatePartnerRequestDto,
    partialPartnerRequest: PartnerRequest,
  ): Promise<PartnerRequestDto> {
    partialPartnerRequest.partner_name = incomingPartnerRequest.name;
    partialPartnerRequest.acronym = incomingPartnerRequest.acronym;
    partialPartnerRequest.web_page = incomingPartnerRequest.websiteLink;
    partialPartnerRequest.is_office = false;
    partialPartnerRequest.request_source = incomingPartnerRequest.requestSource;
    partialPartnerRequest.external_user_mail =
      incomingPartnerRequest.externalUserMail;
    partialPartnerRequest.external_user_name =
      incomingPartnerRequest.externalUserName;
    partialPartnerRequest.external_user_comments =
      incomingPartnerRequest.externalUserComments;

    partialPartnerRequest.institution_type_id =
      partialPartnerRequest.institution_type_object.id;
    partialPartnerRequest.country_id = partialPartnerRequest.country_object.id;
    partialPartnerRequest.mis_id = partialPartnerRequest.mis_object.id;

    partialPartnerRequest.auditableFields.created_by =
      partialPartnerRequest.auditableFields.created_by_object.id;

    partialPartnerRequest.category_1 = incomingPartnerRequest.category_1;
    partialPartnerRequest.category_2 = incomingPartnerRequest.category_2;
    partialPartnerRequest.platform_url = incomingPartnerRequest.platformUrl;

    partialPartnerRequest.auditableFields.is_active = false;
    partialPartnerRequest = await this.save(partialPartnerRequest);

    partialPartnerRequest.partner_request_id = partialPartnerRequest.id;
    delete partialPartnerRequest.id;
    partialPartnerRequest.auditableFields.is_active = true;
    partialPartnerRequest = await this.save(partialPartnerRequest);

    return this.findPartnerRequestById(partialPartnerRequest.id).finally(() => {
      this.messageMicroservice.sendPartnerRequestEmail(
        EmailTemplate.PARTNER_REQUEST_INCOMING,
        partialPartnerRequest,
      );
    });
  }

  async respondPartnerRequest(
    partialPartnerRequest: PartnerRequest,
    respondPartnerRequestDto: RespondRequestDto,
  ): Promise<PartnerRequestDto> {
    partialPartnerRequest.auditableFields.is_active = false;
    if (partialPartnerRequest.partner_request_id == null) {
      await this.save(partialPartnerRequest);
      partialPartnerRequest.partner_request_id = partialPartnerRequest.id;
      delete partialPartnerRequest.id;
    }

    partialPartnerRequest.external_user_mail =
      respondPartnerRequestDto.externalUserMail;
    partialPartnerRequest.external_user_name =
      respondPartnerRequestDto.externalUserName;
    partialPartnerRequest.external_user_comments =
      respondPartnerRequestDto.externalUserComments;

    const accepted = respondPartnerRequestDto.accept;
    partialPartnerRequest.accepted = accepted;

    partialPartnerRequest.auditableFields.updated_by = accepted
      ? partialPartnerRequest.accepted_by
      : partialPartnerRequest.rejected_by;

    if (accepted) {
      const newInstitution = await this.institutionRepository.createInstitution(
        partialPartnerRequest,
      );
      partialPartnerRequest.institution_id = newInstitution.code;
    }

    partialPartnerRequest = await this.save(partialPartnerRequest);

    partialPartnerRequest['misAcronym'] =
      partialPartnerRequest.mis_object.acronym;
    partialPartnerRequest['platformUrl'] = partialPartnerRequest.platform_url;

    return this.findPartnerRequestById(partialPartnerRequest.id, true).finally(
      () => {
        this.messageMicroservice.sendPartnerRequestEmail(
          EmailTemplate.PARTNER_REQUEST_RESPONSE,
          partialPartnerRequest,
        );
      },
    );
  }

  async updatePartnerRequest(
    updatePartnerRequest: UpdatePartnerRequestDto,
    partnerRequest: PartnerRequest,
  ): Promise<PartnerRequestDto> {
    if (partnerRequest.partner_request_id == null) {
      partnerRequest.auditableFields.is_active = false;
      await this.save(partnerRequest);

      partnerRequest.partner_request_id = partnerRequest.id;
      delete partnerRequest.id;
    }

    partnerRequest.auditableFields.is_active = true;
    partnerRequest.partner_name = updatePartnerRequest.name;
    partnerRequest.acronym = updatePartnerRequest.acronym;
    partnerRequest.web_page = updatePartnerRequest.websiteLink;
    partnerRequest.institution_type_id =
      partnerRequest.institution_type_object.id;
    partnerRequest.country_id = partnerRequest.country_object.id;
    partnerRequest.category_1 = updatePartnerRequest.category_1;
    partnerRequest.category_2 = updatePartnerRequest.category_2;
    partnerRequest.auditableFields.updated_by =
      partnerRequest.auditableFields.updated_by_object.id;
    partnerRequest.auditableFields.modification_justification =
      updatePartnerRequest.modification_justification;

    partnerRequest = await this.save(partnerRequest);

    return this.findPartnerRequestById(partnerRequest.id);
  }

  async createPartnerRequestBulk(partnerRequestBulk: BulkPartnerRequestDto) {
    let newPartnerRequest: PartnerRequest;
    const partnerCreate: PartnerRequest[] = [];
    const now = new Date();

    const countries: Country[] = await this.countryRepository.find();
    const institutionTypes: InstitutionType[] = await this.institutionType.find(
      { where: { source_id: 1 } },
    );

    return this.dataSource
      .transaction(async (manager) => {
        for (let i = 0; i < partnerRequestBulk.listPartnerRequest.length; i++) {
          const incomingPartnerRequest =
            partnerRequestBulk.listPartnerRequest[i];

          if (
            incomingPartnerRequest.name == undefined ||
            incomingPartnerRequest.name.trim() == ''
          ) {
            throw new Error(`Name is required for partner request[${i}]`);
          }

          newPartnerRequest = new PartnerRequest();

          newPartnerRequest.partner_name = incomingPartnerRequest.name;
          newPartnerRequest.acronym = incomingPartnerRequest.acronym;
          newPartnerRequest.web_page = incomingPartnerRequest.website_link;
          newPartnerRequest.is_office = false;
          newPartnerRequest.external_user_mail =
            partnerRequestBulk.externalUserEmail;
          newPartnerRequest.external_user_name =
            partnerRequestBulk.externalUserName;
          newPartnerRequest.mis_id = partnerRequestBulk.mis;

          newPartnerRequest.auditableFields = new AuditableEntity();
          newPartnerRequest.auditableFields.created_by =
            partnerRequestBulk.externalUser;
          newPartnerRequest.auditableFields.is_active = false;
          delete newPartnerRequest.id;

          let incomingPRCountryCode = (
            incomingPartnerRequest.country ?? ''
          ).trim();
          const foundParentheses = incomingPRCountryCode.lastIndexOf('(') + 1;
          incomingPRCountryCode = incomingPRCountryCode.slice(
            foundParentheses,
            foundParentheses + 2,
          );
          const incomingPRCountry = countries.find(
            (country) =>
              StringContentComparator.contentCompare(
                country.iso_alpha_2,
                incomingPRCountryCode,
              ) === 0,
          );
          if (!incomingPRCountry) {
            throw new Error(
              `Country with code "${incomingPRCountryCode}" not found for partner "${incomingPartnerRequest.name}"`,
            );
          }

          newPartnerRequest.country_id = incomingPRCountry.id;

          const incomingPRType = institutionTypes.find(
            (typeIntitution) =>
              StringContentComparator.contentCompare(
                typeIntitution.name,
                incomingPartnerRequest.institution_type,
              ) === 0,
          );
          if (!incomingPRType) {
            throw new Error(
              `Institution type with name "${incomingPartnerRequest.institution_type}" not found for partner "${incomingPartnerRequest.name}"`,
            );
          }

          newPartnerRequest.institution_type_id = incomingPRType.id;

          newPartnerRequest = await manager.save(newPartnerRequest);
          newPartnerRequest.partner_request_id = newPartnerRequest.id;

          if (
            StringContentComparator.contentCompare(
              'Accepted',
              incomingPartnerRequest.status,
            ) === 0
          ) {
            newPartnerRequest.accepted = true;
            newPartnerRequest.accepted_by = partnerRequestBulk.accepted;
            newPartnerRequest.accepted_date = now;
            const createdInstitution =
              await this.institutionRepository.createBulkInstitution(
                manager,
                newPartnerRequest,
                partnerRequestBulk.accepted,
              );
            newPartnerRequest.institution_id = createdInstitution.id;
          } else if (
            StringContentComparator.contentCompare(
              'Rejected',
              incomingPartnerRequest.status,
            ) === 0
          ) {
            if (
              incomingPartnerRequest.justification == undefined ||
              incomingPartnerRequest.justification.trim() == ''
            ) {
              throw new Error(
                `Justification is required for rejected partner request "${incomingPartnerRequest.name}"`,
              );
            }

            newPartnerRequest.accepted = false;
            newPartnerRequest.rejected_by = partnerRequestBulk.accepted;
            newPartnerRequest.reject_justification =
              incomingPartnerRequest.justification;
            newPartnerRequest.rejected_date = now;
          } else {
            throw new Error(
              `Status "${incomingPartnerRequest.status}" not recognized for partner "${incomingPartnerRequest.name}"`,
            );
          }

          newPartnerRequest = await manager.save(newPartnerRequest);

          partnerCreate.push(newPartnerRequest);
        }

        return partnerCreate;
      })
      .then((partnerRequests) => {
        const newInstitutionIds = partnerRequests
          .filter((pr) => pr.accepted)
          .map((pr) => pr.institution_id);
        return this.institutionRepository
          .findInstitutions(
            FindAllOptions.SHOW_ALL,
            undefined,
            newInstitutionIds,
          )
          .then((institutions) => {
            return partnerRequests.map((pr) => {
              pr['institutionDto'] = institutions.find(
                (i) => i.code === pr.institution_id,
              );
              return pr;
            });
          });
      })
      .catch((error: Error) => {
        throw ResponseDto.buildCustomResponse(
          error.message,
          'The bulk partner request could not be processed. Please check your input',
          400,
        );
      });
  }
}
