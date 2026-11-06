import { DataSource } from 'typeorm';
import { CONTENT_EDITING_LOCKED, SettingsService } from './settings.service';
import { AppSetting } from './entities/app-setting.entity';

describe('SettingsService (content editing lock)', () => {
  const rows = new Map<string, any>();
  const manager = {
    findOne: jest.fn(
      async (_e: unknown, { where }: any) => rows.get(where.key) ?? null,
    ),
    save: jest.fn(async (_e: unknown, row: any) => {
      rows.set(row.key, row);
      return row;
    }),
  };
  const service = new SettingsService({ manager } as unknown as DataSource);

  beforeEach(() => rows.clear());

  it('no row means unlocked', async () => {
    await expect(service.contentEditing()).resolves.toEqual({
      locked: false,
      updated_at: null,
      updated_by: null,
    });
  });

  it('locking stores who and when, and reads back locked', async () => {
    const state = await service.setContentEditing(true, 'admin@cgiar.org');
    expect(manager.save).toHaveBeenCalledWith(
      AppSetting,
      expect.objectContaining({ key: CONTENT_EDITING_LOCKED, value: 'true' }),
    );
    expect(state.locked).toBe(true);
    expect(state.updated_by).toBe('admin@cgiar.org');
    expect(state.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await expect(service.isContentEditingLocked()).resolves.toBe(true);
  });

  it('only the text "true" locks: anything else stored by hand is unlocked', async () => {
    rows.set(CONTENT_EDITING_LOCKED, {
      key: CONTENT_EDITING_LOCKED,
      value: 'TRUE ',
    });
    await expect(service.isContentEditingLocked()).resolves.toBe(false);
    await service.setContentEditing(false, null);
    await expect(service.isContentEditingLocked()).resolves.toBe(false);
  });
});
