import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { GlobalParameterService } from '../../../api/global-parameter/global-parameter.service';
import { Cache } from 'cache-manager';
import { Cron } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class GlobalParameterCron implements OnApplicationBootstrap {
  private readonly logger: Logger = new Logger(GlobalParameterCron.name);

  constructor(
    private readonly _globalParameterService: GlobalParameterService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  /**
   * This method is called when the application has fully started and is ready to accept requests.
   * It triggers the method to populate the global parameters cache.
   */
  onApplicationBootstrap() {
    this.cronRefreshGlobalParametersCache(true);
  }

  // the cache is set to expire every 8 hours, but we are going to update it every 7 hours
  @Cron('0 0 */7 * * *')
  public async cronRefreshGlobalParametersCache(onInit = false) {
    this.logger.log(
      `Global parameter cache refresh ${onInit ? '' : 'cron job '}started`,
    );

    const globalParameters = await this._globalParameterService.findAll();

    await this.cache.clear();

    globalParameters.forEach(async (globalParameter) => {
      await this.cache.set(globalParameter.name, globalParameter.value);
    });

    this.logger.log(
      `Global parameter cache refresh ${onInit ? '' : 'cron job '}finished`,
    );
  }
}
