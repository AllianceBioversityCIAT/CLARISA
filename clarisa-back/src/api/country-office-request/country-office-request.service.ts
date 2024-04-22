import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Country } from '../country/entities/country.entity';
import { CountryRepository } from '../country/repositories/country.repository';
import { Institution } from '../institution/entities/institution.entity';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { Mis } from '../mis/entities/mis.entity';
import { User } from '../user/entities/user.entity';
import { CountryOfficeRequestDto } from './dto/country-office-request.dto';
import { CreateCountryOfficeRequestDto } from './dto/create-country-office-request.dto';
import { RespondRequestDto } from '../../shared/entities/dtos/respond-request.dto';
import { UpdateCountryOfficeRequestDto } from './dto/update-country-office-request.dto';
import { CountryOfficeRequest } from './entities/country-office-request.entity';
import { CountryOfficeRequestRepository } from './repositories/country-office-request.repository';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { MisOption } from '../../shared/entities/enums/mises-options';
import { PartnerStatus } from '../../shared/entities/enums/partner-status';
import { UserData } from '../../shared/interfaces/user-data';
import { MisRepository } from '../mis/repositories/mis.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { AuditableEntity } from '../../shared/entities/extends/auditable-entity.entity';

@Injectable()
export class CountryOfficeRequestService {
  constructor(
    private countryOfficeRequestRepository: CountryOfficeRequestRepository,
    private institutionRepository: InstitutionRepository,
    private misRepository: MisRepository,
    private countryRepository: CountryRepository,
    private userRepository: UserRepository,
  ) {}

  async findAll(
    status: string = PartnerStatus.PENDING.path,
    mis: string = MisOption.ALL.path,
  ): Promise<CountryOfficeRequestDto[]> {
    if (!PartnerStatus.getfromPath(status)) {
      throw Error('?!');
    }

    if (!MisOption.getfromPath(mis)) {
      throw Error('?!');
    }

    return this.countryOfficeRequestRepository.findAllCountryOfficeRequests(
      status,
      mis,
    );
  }

  async findOne(id: number): Promise<CountryOfficeRequestDto> {
    return this.countryOfficeRequestRepository.findCountryOfficeRequestById(id);
  }

  async createCountryOfficeRequest(
    incomingCountryOfficeRequest: CreateCountryOfficeRequestDto,
    userData: UserData & { mis: string },
  ): Promise<ResponseDto<CountryOfficeRequestDto[]>> {
    incomingCountryOfficeRequest.userId = userData.userId;
    incomingCountryOfficeRequest.externalUserMail =
      incomingCountryOfficeRequest.externalUserMail ?? userData.email;

    if (userData.mis && !incomingCountryOfficeRequest.misAcronym) {
      incomingCountryOfficeRequest.misAcronym = userData.mis;
    }

    incomingCountryOfficeRequest = plainToInstance(
      CreateCountryOfficeRequestDto,
      incomingCountryOfficeRequest,
    );

    //Basic validations
    const validationErrors: string[] = (
      await validate(incomingCountryOfficeRequest)
    ).flatMap((e) => {
      const newLocal = Object.values(e.constraints).map((m) => m);
      return newLocal;
    });

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        CountryOfficeRequestService,
      );
    }

    //Comprehensive validations
    const institution: Institution = await this.institutionRepository.findOneBy(
      {
        id: incomingCountryOfficeRequest.institutionCode,
      },
    );

    const mis: Mis = await this.misRepository.findOneBy({
      acronym: incomingCountryOfficeRequest.misAcronym,
    });

    const createdBy: User = await this.userRepository.findOneBy({
      id: incomingCountryOfficeRequest.userId,
    });

    if (!institution) {
      validationErrors.push(
        `An institution with id '${incomingCountryOfficeRequest.institutionCode}' could not be found`,
      );
    }

    if (!mis) {
      validationErrors.push(
        `An MIS with the acronym '${incomingCountryOfficeRequest.misAcronym}' could not be found`,
      );
    }

    if (!createdBy) {
      validationErrors.push(
        `An user with the id '${incomingCountryOfficeRequest.userId}' could not be found`,
      );
    }

    const countries: Country[] = await Promise.all(
      (incomingCountryOfficeRequest.countryIso ?? ([] as string[])).flatMap(
        async (c: string) => {
          const country: Country = await this.countryRepository.findOneBy({
            iso_alpha_2: c,
          });

          if (!country) {
            validationErrors.push(
              `A country with the ISO-2 code '${c}' could not be found`,
            );
          }

          return country;
        },
      ),
    );

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        CountryOfficeRequestService,
      );
    }

    const newCountryOfficeRequests: CountryOfficeRequest[] = await Promise.all(
      countries.map(async (c) => {
        const newCountryOfficeRequest: CountryOfficeRequest =
          new CountryOfficeRequest();
        newCountryOfficeRequest.auditableFields = new AuditableEntity();

        newCountryOfficeRequest.institution_object = institution;
        newCountryOfficeRequest.mis_object = mis;
        newCountryOfficeRequest.auditableFields.created_by_object = createdBy;
        newCountryOfficeRequest.country_object = c;

        return newCountryOfficeRequest;
      }),
    );

    const response: CountryOfficeRequestDto[] =
      await this.countryOfficeRequestRepository.createCountryOfficeRequest(
        incomingCountryOfficeRequest,
        newCountryOfficeRequests,
      );

    return ResponseDto.createCreatedResponse(
      response,
      CountryOfficeRequestService,
    );
  }

  async respondCountryOfficeRequest(
    respondCountryOfficeRequestDto: RespondRequestDto,
    userData: UserData,
  ): Promise<CountryOfficeRequestDto> {
    respondCountryOfficeRequestDto.userId = userData.userId;
    respondCountryOfficeRequestDto.externalUserMail =
      respondCountryOfficeRequestDto.externalUserMail ??= userData.email;

    respondCountryOfficeRequestDto = plainToInstance(
      RespondRequestDto,
      respondCountryOfficeRequestDto,
    );

    //Basic validations
    const validationErrors: string[] = (
      await validate(respondCountryOfficeRequestDto)
    ).flatMap((e) => {
      const newLocal = Object.values(e.constraints).map((m) => m);
      return newLocal;
    });

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        CountryOfficeRequestService,
      );
    }

    //Comprehensive validations
    const countryOfficeRequest: CountryOfficeRequest =
      await this.countryOfficeRequestRepository.findOneBy({
        id: respondCountryOfficeRequestDto.requestId,
      });

    const user: User = await this.userRepository.findOneBy({
      id: respondCountryOfficeRequestDto.userId,
    });

    if (!countryOfficeRequest) {
      validationErrors.push(
        `A country office request with id '${respondCountryOfficeRequestDto.requestId}' could not be found`,
      );
    }

    if (!user) {
      validationErrors.push(
        `An user with id '${respondCountryOfficeRequestDto.userId}' could not be found`,
      );
    }

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        CountryOfficeRequestService,
      );
    }

    const now = new Date();

    if (respondCountryOfficeRequestDto.accept) {
      countryOfficeRequest.accepted_by = user.id;
      countryOfficeRequest.accepted_date = now;
    } else {
      countryOfficeRequest.rejected_by = user.id;
      countryOfficeRequest.rejected_date = now;
      countryOfficeRequest.reject_justification =
        respondCountryOfficeRequestDto.rejectJustification;
    }

    return this.countryOfficeRequestRepository.respondCountryOfficeRequest(
      countryOfficeRequest,
      respondCountryOfficeRequestDto,
    );
  }

  async updateCountryOfficeRequest(
    updateCountryOfficeRequest: UpdateCountryOfficeRequestDto,
    userData: UserData,
  ): Promise<ResponseDto<CountryOfficeRequestDto>> {
    updateCountryOfficeRequest = plainToInstance(
      UpdateCountryOfficeRequestDto,
      updateCountryOfficeRequest,
    );

    updateCountryOfficeRequest.userId = userData.userId;
    updateCountryOfficeRequest.externalUserMail =
      updateCountryOfficeRequest.externalUserMail ??= userData.email;
    // we do not really want the user to send these fields again, and
    // in order for the next validation not to fail, they need to have
    // any value
    updateCountryOfficeRequest.misAcronym = 'SOME';
    updateCountryOfficeRequest.externalUserMail = 'some@mail.com';

    //Basic validations
    const validationErrors: string[] = (
      await validate(updateCountryOfficeRequest)
    ).flatMap((e) => Object.values(e.constraints).map((m) => m));

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        CountryOfficeRequestService,
      );
    }

    //Comprehensive validations
    const countryOfficeRequest: CountryOfficeRequest =
      await this.countryOfficeRequestRepository.findOneBy({
        id: updateCountryOfficeRequest.id,
      });

    countryOfficeRequest.auditableFields.updated_by_object =
      await this.userRepository.findOneBy({
        id: updateCountryOfficeRequest.userId,
      });

    countryOfficeRequest.country_object =
      await this.countryRepository.findOneBy({
        id: updateCountryOfficeRequest.userId,
      });

    if (!countryOfficeRequest) {
      validationErrors.push(
        `A country office request with id '${updateCountryOfficeRequest.id}' could not be found`,
      );
    }

    if (!countryOfficeRequest.auditableFields.is_active) {
      validationErrors.push(
        `The country office request is not active. Please check if it has been accepted or rejected`,
      );
    }

    if (!countryOfficeRequest.country_object) {
      validationErrors.push(
        `A country with the ISO-2 code '${updateCountryOfficeRequest.countryIso}' could not be found`,
      );
    }

    if (!countryOfficeRequest.auditableFields.updated_by_object) {
      validationErrors.push(
        `An user with id '${updateCountryOfficeRequest.userId}' could not be found`,
      );
    }

    if (validationErrors.length > 0) {
      throw ResponseDto.createBadResponse(
        validationErrors,
        CountryOfficeRequestService,
      );
    }

    const response: CountryOfficeRequestDto =
      await this.countryOfficeRequestRepository.updateCountryOfficeRequest(
        updateCountryOfficeRequest,
        countryOfficeRequest,
      );

    return ResponseDto.createCreatedResponse(
      response,
      CountryOfficeRequestService,
    );
  }
}
