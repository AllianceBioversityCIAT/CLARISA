import { Injectable } from '@nestjs/common';
import { CreateQaTokenAuthDto } from './dto/create-qa-token-auth.dto';
import { QaTokenAuth } from './entities/qa-token-auth.entity';
import { QaTokenAuthRepository } from './repositories/qa-token-auth.repository';
import { TokenQaDto } from '../../integration/qa/dto/token-qa.dto';
import { QaApi } from '../../integration/qa/qa.api';
import { lastValueFrom } from 'rxjs';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';
import { isEmail } from '../../shared/utils/emil-validator';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { InternalServerError } from '../../shared/errors/internal-server-error';

@Injectable()
export class QaTokenAuthService {
  constructor(
    private qaService: QaApi,
    private _qaTokenAuthRepository: QaTokenAuthRepository,
  ) {}

  async findAll() {
    return this._qaTokenAuthRepository.find();
  }

  async findOne(id: number) {
    return this._qaTokenAuthRepository
      .findOneByOrFail({
        id,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._qaTokenAuthRepository.target.toString(),
          id,
        );
      });
  }

  async create(createQaTokenDto: CreateQaTokenAuthDto): Promise<QaTokenAuth> {
    this._validateOnCreation(createQaTokenDto);

    let qaTokenId: number = await this._qaTokenAuthRepository.query(
      `SELECT getQAToken(?,?,?,?,?,?)`,
      [
        createQaTokenDto.name,
        createQaTokenDto.username,
        createQaTokenDto.email,
        createQaTokenDto.misAcronym,
        createQaTokenDto.appUser,
        createQaTokenDto.official_code,
      ],
    );
    qaTokenId = qaTokenId[0][Object.keys(qaTokenId[0])[0]];

    return this.findOne(qaTokenId)
      .catch(() => {
        throw new InternalServerError('A QA token could not be created.');
      })
      .then((qaToken) => {
        const bodyRequestQa: TokenQaDto = {
          token: qaToken.token,
          expiration_date: qaToken.expiration_date.toString(),
          crp_id: qaToken.official_code,
          username: qaToken.username,
          email: qaToken.email,
          name: qaToken.name,
          app_user: `${qaToken.app_user}`,
        };

        return lastValueFrom(this.qaService.postQaToken(bodyRequestQa)).then(
          () => {
            return qaToken;
          },
        );
      });
  }

  private _validateOnCreation(createQaTokenDto: CreateQaTokenAuthDto) {
    if (!createQaTokenDto) {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto',
        createQaTokenDto,
      );
    }

    if (!createQaTokenDto.name || createQaTokenDto.name == '') {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.name',
        createQaTokenDto,
      );
    }

    if (!createQaTokenDto.username || createQaTokenDto.username == '') {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.username',
        createQaTokenDto,
      );
    }

    if (!createQaTokenDto.email || createQaTokenDto.email == '') {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.email',
        createQaTokenDto,
      );
    }

    if (!createQaTokenDto.misAcronym || createQaTokenDto.misAcronym == '') {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.misAcronym',
        createQaTokenDto,
      );
    }

    if (!createQaTokenDto.appUser || createQaTokenDto.appUser == '') {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.appUser',
        createQaTokenDto,
      );
    }

    if (!isEmail(createQaTokenDto.email)) {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.email',
        createQaTokenDto.email,
        'The email is not valid',
      );
    }

    if (
      createQaTokenDto.misAcronym.toLowerCase() == 'prms' &&
      createQaTokenDto.official_code == ''
    ) {
      throw new BadParamsError(
        this._qaTokenAuthRepository.target.toString(),
        'createQaTokenDto.official_code',
        createQaTokenDto.official_code,
        'The official code is required',
      );
    }
  }
}
