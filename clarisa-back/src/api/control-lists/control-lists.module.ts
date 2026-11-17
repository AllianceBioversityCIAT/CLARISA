import {
  Logger,
  Module,
  Provider,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { GuardsModule } from '../../shared/guards/guards.module';
import { UserModule } from '../user/user.module';
import { ControlListsConfig } from './control-lists.config';
import { ControlListsEnabledGuard } from './control-lists-enabled.guard';
import {
  ControlListsAdminController,
  ControlListsPublicController,
} from './control-lists.controller';
import { DataService } from './data.service';
import { EngineService } from './engine/engine.service';
import { LazyDb } from './engine/lazy-db';
import { ListsService } from './lists.service';

export const CL_ENGINE_DB = 'CL_ENGINE_DB';
export const CL_DATA_DB = 'CL_DATA_DB';

/**
 * Options of the two connections to the lists schema. Small pools: the
 * catalog goes through the main CLARISA connection (review §5: three new
 * pools meant up to 30 more connections per instance).
 * Types answered as the public contract needs them (review §4 J): numbers
 * for BIGINT and DECIMAL, dates as written (`dateStrings`, no time zone).
 */
export function controlListsDbOptions(
  kind: 'engine' | 'data',
): DataSourceOptions {
  const c = ControlListsConfig;
  return {
    type: 'mysql',
    name: `control_lists_${kind}`,
    host: c.host,
    port: c.port,
    username: kind === 'engine' ? c.engineUser : c.dataUser,
    password: kind === 'engine' ? c.enginePass : c.dataPass,
    database: c.schema,
    entities: [],
    synchronize: false,
    migrationsRun: false,
    logging: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: true,
    extra: { connectionLimit: 5, decimalNumbers: true },
  };
}

/** Settles half-done operations at boot and every minute (review §8, condition 1). */
export class ControlListsReconciler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger('ControlListsReconciler');
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly engine: EngineService,
    private readonly dbs: LazyDb[],
  ) {}

  onApplicationBootstrap(): void {
    if (!ControlListsConfig.enabled) return;
    void this.tick();
    this.timer = setInterval(
      () => void this.tick(),
      ControlListsConfig.reconcileEveryMs,
    );
    this.timer.unref();
  }

  async tick(): Promise<void> {
    try {
      const r = await this.engine.reconcile();
      if (r?.open)
        this.logger.warn(`${r.open} control list change(s) still unconfirmed.`);
    } catch (e) {
      // Never takes the API down: the module answers 503 until the database is back.
      this.logger.error(`Reconciliation skipped: ${e?.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await Promise.all(this.dbs.map((d) => d.close()));
  }
}

/** Every provider of the module; the e2e suite mounts exactly these. */
export const CONTROL_LISTS_PROVIDERS: Provider[] = [
  ControlListsEnabledGuard,
  {
    provide: CL_ENGINE_DB,
    useFactory: () =>
      new LazyDb(() => controlListsDbOptions('engine'), 'engine'),
  },
  {
    provide: CL_DATA_DB,
    useFactory: () => new LazyDb(() => controlListsDbOptions('data'), 'data'),
  },
  {
    provide: EngineService,
    inject: [DataSource, CL_ENGINE_DB],
    useFactory: (main: DataSource, cl: LazyDb) =>
      new EngineService(
        main,
        cl,
        () => ControlListsConfig.schema,
        () => ControlListsConfig.reconcileGraceSeconds,
      ),
  },
  {
    provide: ListsService,
    inject: [DataSource, EngineService],
    useFactory: (main: DataSource, engine: EngineService) =>
      new ListsService(main, engine),
  },
  {
    provide: DataService,
    inject: [CL_DATA_DB, ListsService],
    useFactory: (data: LazyDb, lists: ListsService) =>
      new DataService(data, lists, () => ControlListsConfig.schema),
  },
  {
    provide: ControlListsReconciler,
    inject: [EngineService, CL_ENGINE_DB, CL_DATA_DB],
    useFactory: (engine: EngineService, a: LazyDb, b: LazyDb) =>
      new ControlListsReconciler(engine, [a, b]),
  },
];

@Module({
  imports: [GuardsModule, UserModule],
  // Admin first, so `admin/...` never falls into the public `:code` routes.
  controllers: [ControlListsAdminController, ControlListsPublicController],
  providers: CONTROL_LISTS_PROVIDERS,
})
export class ControlListsModule {}
