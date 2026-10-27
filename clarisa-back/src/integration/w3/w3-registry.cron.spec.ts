import { ConflictException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { W3RegistryCron } from './w3-registry.cron';
import { W3RegistrySyncService } from './w3-registry-sync.service';
import { W3RegistryModule } from './w3-registry.module';
import { W3RegistryApi } from './w3-registry.api';
import { W3RegistrySync } from '../../api/project/entity/w3-registry-sync.entity';

describe('W3RegistryCron', () => {
  let cron: W3RegistryCron;
  const syncService = { syncProjects: jest.fn() };

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        W3RegistryCron,
        { provide: W3RegistrySyncService, useValue: syncService },
      ],
    }).compile();

    cron = module.get<W3RegistryCron>(W3RegistryCron);
  });

  it('is scheduled every sunday at 03:00', () => {
    // Metadata written by @Cron on the real handler (@nestjs/schedule).
    const options = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      W3RegistryCron.prototype.run,
    );

    expect(options.cronTime).toBe('0 0 3 * * 0');
  });

  it('runs the shared sync once and logs the result', async () => {
    syncService.syncProjects.mockResolvedValue(
      Object.assign(new W3RegistrySync(), {
        id: 9,
        processed_count: 989,
        warning_count: 2,
      }),
    );

    await cron.run();

    expect(syncService.syncProjects).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('sync 9: 989 processed, 2 warnings'),
    );
  });

  it('logs a failed sync without rethrowing', async () => {
    syncService.syncProjects.mockRejectedValue(new Error('boom'));

    await expect(cron.run()).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('boom'),
    );
  });

  it('logs an overlapping sync as skipped, not as an error', async () => {
    syncService.syncProjects.mockRejectedValue(
      new ConflictException('W3 Registry sync 77 is already running'),
    );

    await expect(cron.run()).resolves.toBeUndefined();

    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('sync 77'),
    );
    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });

  it('is registered as a provider of W3RegistryModule', async () => {
    const module = await Test.createTestingModule({
      imports: [W3RegistryModule],
    })
      .overrideProvider(W3RegistryApi)
      .useValue({})
      .overrideProvider(W3RegistrySyncService)
      .useValue(syncService)
      .compile();

    expect(module.get(W3RegistryCron)).toBeInstanceOf(W3RegistryCron);
  });
});
