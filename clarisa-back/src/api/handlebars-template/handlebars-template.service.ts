import { Inject, Injectable, Logger } from '@nestjs/common';
import { HandlebarsTemplateRepository } from './repositories/handlebars-template.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { FileNotFoundError } from '../../shared/errors/file-not-found.error';

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
        throw Error('?!');
    }
  }

  findOneById(id: number) {
    return this._handlebarsTemplateRepository.findOne({
      where: {
        id,
        auditableFields: { is_active: true },
      },
    });
  }

  findOneByName(name: string) {
    return this._handlebarsTemplateRepository.findOne({
      where: {
        name,
        auditableFields: { is_active: true },
      },
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
          throw new FileNotFoundError(errorMessage);
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
