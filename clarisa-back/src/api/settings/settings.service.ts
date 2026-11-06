import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlobalParameter } from '../global-parameter/entities/global-parameter.entity';
import { ContentEditingState } from './dto/content-editing.dto';

/** Name of the global parameter that pauses editing of terms and concepts. */
export const CONTENT_EDITING_LOCKED = 'content_editing_locked';

/**
 * The editing lock, kept as one more row of `global_parameters` (the
 * platform's existing parameters table), so there is a single place for
 * parameters. Read straight from the database on every write it guards —
 * not from the 8-hour parameters cache — so turning it on takes effect on
 * the next request, on every instance of the API.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly dataSource: DataSource) {}

  private row() {
    return this.dataSource.manager.findOne(GlobalParameter, {
      where: { name: CONTENT_EDITING_LOCKED },
    });
  }

  async contentEditing(): Promise<ContentEditingState> {
    const row = await this.row();
    const audit = row?.auditableFields;
    const changedBy = audit?.updated_by ?? null;
    let updatedBy: string | null = null;
    if (changedBy) {
      const users: { email: string }[] = await this.dataSource.manager.query(
        `SELECT email FROM users WHERE id = ? LIMIT 1`,
        [changedBy],
      );
      updatedBy = users?.[0]?.email ?? null;
    }
    return {
      locked: !!audit?.is_active && row?.value === 'true',
      updated_at:
        changedBy && audit?.updated_at
          ? new Date(audit.updated_at).toISOString()
          : null,
      updated_by: updatedBy,
    };
  }

  async isContentEditingLocked(): Promise<boolean> {
    const row = await this.row();
    return !!row?.auditableFields?.is_active && row?.value === 'true';
  }

  async setContentEditing(
    locked: boolean,
    userId: number,
  ): Promise<ContentEditingState> {
    const row =
      (await this.row()) ??
      this.dataSource.manager.create(GlobalParameter, {
        name: CONTENT_EDITING_LOCKED,
        description:
          'Pauses creating and editing glossary terms and taxonomy concepts (Parameters page).',
        auditableFields: { is_active: true, created_by: userId },
      } as Partial<GlobalParameter>);
    row.value = locked ? 'true' : 'false';
    row.auditableFields = {
      ...row.auditableFields,
      is_active: true,
      updated_by: userId,
    } as GlobalParameter['auditableFields'];
    await this.dataSource.manager.save(GlobalParameter, row);
    return this.contentEditing();
  }
}
