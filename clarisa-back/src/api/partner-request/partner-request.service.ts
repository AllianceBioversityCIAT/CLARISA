import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RespondRequestDto } from '../../shared/entities/dtos/respond-request.dto';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { MisOption } from '../../shared/entities/enums/mises-options';
import { PartnerStatus } from '../../shared/entities/enums/partner-status';
import { UserData } from '../../shared/interfaces/user-data';
import { CountryRepository } from '../country/repositories/country.repository';
import { User } from '../user/entities/user.entity';
import { CreatePartnerRequestDto } from './dto/create-partner-request.dto';
import { PartnerRequestDto } from './dto/partner-request.dto';
import { UpdatePartnerRequestDto } from './dto/update-partner-request.dto';
import { PartnerRequest } from './entities/partner-request.entity';
import { PartnerRequestRepository } from './repositories/partner-request.repository';
import { CreateBulkPartnerRequestDto } from './dto/create-bulk-partner-request.dto';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { InstitutionTypeRepository } from '../institution-type/repositories/institution-type.repository';
import { MisRepository } from '../mis/repositories/mis.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';

@Injectable()
export class PartnerRequestService {
  constructor(
    private partnerRequestRepository: PartnerRequestRepository,
    private institutionTypeRepository: InstitutionTypeRepository,
    private misRepository: MisRepository,
    private countryRepository: CountryRepository,
    private userRepository: UserRepository,
  ) {}

  async findAll(
    status: string = PartnerStatus.PENDING.path,
    mis: string = MisOption.ALL.path,
    show: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<PartnerRequestDto[]> {
    if (!PartnerStatus.getfromPath(status)) {
      throw Error('?!');
    }

    if (!MisOption.getfromPath(mis)) {
      throw Error('?!');
    }

    return this.partnerRequestRepository.findAllPartnerRequests(
      status,
      mis,
      show,
    );
  }

  async findOne(id: number): Promise<PartnerRequestDto> {
    return this.partnerRequestRepository.findPartnerRequestById(id);
  }

  async createPartnerRequest(
    incomingPartnerRequest: CreatePartnerRequestDto,
    userData: UserData & { mis: string },
  ): Promise<ResponseDto<PartnerRequestDto>> {
    incomingPartnerRequest.userId = userData.userId;
    incomingPartnerRequest.externalUserMail =
      incomingPartnerRequest.externalUserMail ?? userData.email;

    if (userData.mis && !incomingPartnerRequest.misAcronym) {
      incomingPartnerRequest.misAcronym = userData.mis;
    }

    incomingPartnerRequest = plainToInstance(
      CreatePartnerRequestDto,
      incomingPartnerRequest,
    );

    //Basic validations
    const validationErrors: string[] = (
      await validate(incomingPartnerRequest)
    ).flatMap((e) => {
      const newLocal = Object.values(e.constraints).map((m) => m);
      return newLocal;
    });

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        PartnerRequestService,
      );
    }

    //Comprehensive validations
    const newPartnerRequest: PartnerRequest = new PartnerRequest();
    newPartnerRequest.auditableFields = new AuditableEntity();
    newPartnerRequest.institution_type_object =
      await this.institutionTypeRepository.findOne({
        where: { id: incomingPartnerRequest.institutionTypeCode },
        relations: { children: true },
      });

    newPartnerRequest.country_object = await this.countryRepository.findOneBy({
      iso_alpha_2: incomingPartnerRequest.hqCountryIso,
    });

    newPartnerRequest.mis_object = await this.misRepository.findOneBy({
      acronym: incomingPartnerRequest.misAcronym,
    });

    newPartnerRequest.auditableFields.created_by_object =
      await this.userRepository.findOneBy({
        id: incomingPartnerRequest.userId,
      });

    if (!newPartnerRequest.institution_type_object) {
      validationErrors.push(
        `An institution type with id '${incomingPartnerRequest.institutionTypeCode}' could not be found`,
      );
    }

    if (
      (newPartnerRequest.institution_type_object?.children ?? []).length != 0
    ) {
      validationErrors.push(
        `A partner request with an institution type with id '${incomingPartnerRequest.institutionTypeCode}' cannot be created. Use one of the institution types you get when using the /api/institution-types endpoint.`,
      );
    }

    if (!newPartnerRequest.country_object) {
      validationErrors.push(
        `A country with the ISO-2 code '${incomingPartnerRequest.hqCountryIso}' could not be found`,
      );
    }

    if (!newPartnerRequest.mis_object) {
      validationErrors.push(
        `An MIS with the acronym '${incomingPartnerRequest.misAcronym}' could not be found`,
      );
    }

    if (!newPartnerRequest.auditableFields.created_by_object) {
      validationErrors.push(
        `An user with the id '${incomingPartnerRequest.userId}' could not be found`,
      );
    }

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        PartnerRequestService,
      );
    }

    const response: PartnerRequestDto =
      await this.partnerRequestRepository.createPartnerRequest(
        incomingPartnerRequest,
        newPartnerRequest,
      );

    return ResponseDto.createCreatedResponse(response, PartnerRequestService);
  }

  async respondPartnerRequest(
    respondPartnerRequestDto: RespondRequestDto,
    userData: UserData,
  ): Promise<PartnerRequestDto> {
    respondPartnerRequestDto.userId = userData.userId;
    respondPartnerRequestDto.externalUserMail =
      respondPartnerRequestDto.externalUserMail ??= userData.email;

    respondPartnerRequestDto = plainToInstance(
      RespondRequestDto,
      respondPartnerRequestDto,
    );

    //Basic validations
    const validationErrors: string[] = (
      await validate(respondPartnerRequestDto)
    ).flatMap((e) => {
      const newLocal = Object.values(e.constraints).map((m) => m);
      return newLocal;
    });

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        PartnerRequestService,
      );
    }

    //Comprehensive validations
    const partnerRequest: PartnerRequest =
      await this.partnerRequestRepository.findOne({
        where: { id: respondPartnerRequestDto.requestId },
        relations: { mis_object: true },
      });

    const user: User = await this.userRepository.findOneBy({
      id: respondPartnerRequestDto.userId,
    });

    if (!partnerRequest) {
      validationErrors.push(
        `A partner request with id '${respondPartnerRequestDto.requestId}' could not be found`,
      );
    } else {
      if (!partnerRequest.auditableFields.is_active) {
        validationErrors.push(
          `The partner request with id '${respondPartnerRequestDto.requestId}' has already been responded`,
        );
      }
    }

    if (!user) {
      validationErrors.push(
        `An user with id '${respondPartnerRequestDto.userId}' could not be found`,
      );
    }

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        PartnerRequestService,
      );
    }

    const now = new Date();

    if (respondPartnerRequestDto.accept) {
      partnerRequest.accepted_by = user.id;
      partnerRequest.accepted_date = now;
    } else {
      partnerRequest.rejected_by = user.id;
      partnerRequest.rejected_date = now;
      partnerRequest.reject_justification =
        respondPartnerRequestDto.rejectJustification;
    }

    return this.partnerRequestRepository.respondPartnerRequest(
      partnerRequest,
      respondPartnerRequestDto,
    );
  }

  async updatePartnerRequest(
    updatePartnerRequest: UpdatePartnerRequestDto,
    userData: UserData,
  ): Promise<ResponseDto<PartnerRequestDto>> {
    updatePartnerRequest = plainToInstance(
      UpdatePartnerRequestDto,
      updatePartnerRequest,
    );

    updatePartnerRequest.userId = userData.userId;
    updatePartnerRequest.externalUserMail =
      updatePartnerRequest.externalUserMail ??= userData.email;
    // we do not really want the user to send these fields again, and
    // in order for the next validation not to fail, they need to have
    // any value
    updatePartnerRequest.misAcronym = 'SOME';
    updatePartnerRequest.externalUserMail = 'some@mail.com';

    //Basic validations
    const validationErrors: string[] = (
      await validate(updatePartnerRequest)
    ).flatMap((e) => Object.values(e.constraints).map((m) => m));

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        PartnerRequestService,
      );
    }

    //Comprehensive validations
    const partnerRequest: PartnerRequest =
      await this.partnerRequestRepository.findOneBy({
        id: updatePartnerRequest.id,
      });

    partnerRequest.auditableFields.updated_by_object =
      await this.userRepository.findOneBy({
        id: updatePartnerRequest.userId,
      });

    partnerRequest.country_object = await this.countryRepository.findOneBy({
      iso_alpha_2: updatePartnerRequest.hqCountryIso,
    });

    partnerRequest.institution_type_object =
      await this.institutionTypeRepository.findOneBy({
        id: updatePartnerRequest.institutionTypeCode,
      });

    if (!partnerRequest) {
      validationErrors.push(
        `A partner request with id '${updatePartnerRequest.id}' could not be found`,
      );
    }

    if (!partnerRequest.auditableFields.is_active) {
      validationErrors.push(
        `The partner request is not active. Please check if it has been accepted or rejected`,
      );
    }

    if (!partnerRequest.auditableFields.updated_by_object) {
      validationErrors.push(
        `An user with id '${updatePartnerRequest.userId}' could not be found`,
      );
    }

    if (!partnerRequest.institution_type_object) {
      validationErrors.push(
        `An institution type with id '${updatePartnerRequest.institutionTypeCode}' could not be found`,
      );
    }

    if (!partnerRequest.country_object) {
      validationErrors.push(
        `A country with the ISO-2 code '${updatePartnerRequest.hqCountryIso}' could not be found`,
      );
    }

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        PartnerRequestService,
      );
    }

    const response: PartnerRequestDto =
      await this.partnerRequestRepository.updatePartnerRequest(
        updatePartnerRequest,
        partnerRequest,
      );

    return ResponseDto.createCreatedResponse(response, PartnerRequestService);
  }

  async statisticsPartnerRequest(mis: string = MisOption.ALL.path) {
    if (!MisOption.getfromPath(mis)) {
      throw Error('?!');
    }
    return this.partnerRequestRepository.statisticsPartner(mis);
  }

  async createBulk(createBulkPartner: CreateBulkPartnerRequestDto) {
    return await this.partnerRequestRepository.createPartnerRequestBulk(
      createBulkPartner,
    );
  }
}
