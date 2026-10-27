import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { W3RegistrySyncService } from './w3-registry-sync.service';

@Injectable()
export class W3RegistryCron {
  private readonly logger: Logger = new Logger(W3RegistryCron.name);

  constructor(private readonly syncService: W3RegistrySyncService) {}

  // every sunday at 3 am
  @Cron('0 0 3 * * 0', { name: 'w3-registry-weekly-sync' })
  public async run(): Promise<void> {
    this.logger.log('Started W3 Registry weekly synchronization');
    try {
      const sync = await this.syncService.syncProjects();
      this.logger.log(
        `Finished W3 Registry sync ${sync.id}: ${sync.processed_count} processed, ${sync.warning_count} warnings`,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(`Skipped W3 Registry weekly sync: ${error.message}`);
        return;
      }
      this.logger.error(
        `W3 Registry weekly sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
