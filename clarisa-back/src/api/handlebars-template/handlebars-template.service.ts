import { Inject, Injectable, Logger } from '@nestjs/common';
import { HandlebarsTemplateRepository } from './repositories/handlebars-template.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class HandlebarsTemplateService {
  private readonly _logger: Logger = new Logger(HandlebarsTemplateService.name);
  constructor(
    private readonly _handlebarsTemplateRepository: HandlebarsTemplateRepository,
    @Inject(CACHE_MANAGER) private _cache: Cache,
  ) {}

  findAll(option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._handlebarsTemplateRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._handlebarsTemplateRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._handlebarsTemplateRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  findOneById(id: number) {
    return this._handlebarsTemplateRepository
      .findOneOrFail({
        where: {
          id,
          auditableFields: { is_active: true },
        },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._handlebarsTemplateRepository.target.toString(),
          id,
        );
      });
  }

  findOneByName(name: string) {
    return this._handlebarsTemplateRepository
      .findOneOrFail({
        where: {
          name,
          auditableFields: { is_active: true },
        },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forSingleParam(
          this._handlebarsTemplateRepository.target.toString(),
          'name',
          name,
        );
      });
  }

  async getAndUpdateTemplate(templatePath: string): Promise<string> {
    return this._cache.get<string>(templatePath).then((template) => {
      if (template) {
        this._logger.debug(`template found in cache for path ${templatePath}`);
        return template;
      }

      return this.findOneByName(templatePath).then((hbt) => {
        if (!hbt) {
          const errorMessage = `error reading template on path ${templatePath}.`;
          this._logger.error(errorMessage);
          throw new BadParamsError(
            this._handlebarsTemplateRepository.target.toString(),
            'templatePath',
            templatePath,
          );
        }

        return this._cache.set(templatePath, hbt.template).then(() => {
          this._logger.debug(
            `template stored in cache for path ${templatePath}`,
          );
          return hbt.template;
        });
      });
    });
  }
}
