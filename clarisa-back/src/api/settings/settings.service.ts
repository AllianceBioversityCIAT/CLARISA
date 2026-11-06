import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { ContentEditingState } from './dto/content-editing.dto';

/** Key of the parameter that pauses editing of glossary terms and concepts. */
export const CONTENT_EDITING_LOCKED = 'content_editing_locked';

/**
 * Parameters of the platform (`app_settings`). Read on every write it
 * guards, never cached: turning the lock on takes effect on the next request,
 * on every instance of the API.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly dataSource: DataSource) {}

  async contentEditing(): Promise<ContentEditingState> {
    const row = await this.dataSource.manager.findOne(AppSetting, {
      where: { key: CONTENT_EDITING_LOCKED },
    });
    return {
      locked: row?.value === 'true',
      updated_at: row?.updated_at
        ? new Date(row.updated_at).toISOString()
        : null,
      updated_by: row?.updated_by_email ?? null,
    };
  }

  async isContentEditingLocked(): Promise<boolean> {
    return (await this.contentEditing()).locked;
  }

  async setContentEditing(
    locked: boolean,
    email: string | null,
  ): Promise<ContentEditingState> {
    await this.dataSource.manager.save(AppSetting, {
      key: CONTENT_EDITING_LOCKED,
      value: locked ? 'true' : 'false',
      updated_at: new Date(),
      updated_by_email: email ?? null,
    });
    return this.contentEditing();
  }
}
