import { Inject, Injectable, Logger } from '@nestjs/common';
import { GlobalParameterService } from '../../../api/global-parameter/global-parameter.service';
import { Cache } from 'cache-manager';
import { Cron } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class GlobalParameterCron {
  private readonly logger: Logger = new Logger(GlobalParameterCron.name);

  constructor(
    private readonly _globalParameterService: GlobalParameterService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  // the cache is set to expire every 8 hours, but we are going to update it every 7 hours
  @Cron('0 0 */7 * * *')
  public async cronRefreshGlobalParametersCache() {
    this.logger.log('Cron job started');

    const globalParameters = await this._globalParameterService.findAll();

    this.cache.reset();

    globalParameters.forEach(async (globalParameter) => {
      await this.cache.set(globalParameter.name, globalParameter.value);
    });

    this.logger.log('Cron job finished');
  }
}
