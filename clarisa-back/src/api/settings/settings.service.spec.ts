import { DataSource } from 'typeorm';
import { CONTENT_EDITING_LOCKED, SettingsService } from './settings.service';
import { GlobalParameter } from '../global-parameter/entities/global-parameter.entity';

describe('SettingsService (editing lock on global_parameters)', () => {
  let row: any = null;
  const manager = {
    findOne: jest.fn(async (_e: unknown, { where }: any) =>
      row && row.name === where.name ? row : null,
    ),
    create: jest.fn((_e: unknown, plain: any) => ({ ...plain })),
    save: jest.fn(async (_e: unknown, value: any) => {
      value.auditableFields.updated_at = new Date('2026-11-06T15:00:00Z');
      row = value;
      return value;
    }),
    query: jest.fn(async () => [{ email: 'admin@cgiar.org' }]),
  };
  const service = new SettingsService({ manager } as unknown as DataSource);

  beforeEach(() => {
    row = null;
    jest.clearAllMocks();
  });

  it('no row means unlocked', async () => {
    await expect(service.contentEditing()).resolves.toEqual({
      locked: false,
      updated_at: null,
      updated_by: null,
    });
  });

  it('locking writes the parameter with who changed it, and reads back locked', async () => {
    const state = await service.setContentEditing(true, 7);
    expect(manager.save).toHaveBeenCalledWith(
      GlobalParameter,
      expect.objectContaining({ name: CONTENT_EDITING_LOCKED, value: 'true' }),
    );
    expect(row.auditableFields).toMatchObject({
      is_active: true,
      updated_by: 7,
      created_by: 7,
    });
    expect(state).toEqual({
      locked: true,
      updated_at: '2026-11-06T15:00:00.000Z',
      updated_by: 'admin@cgiar.org',
    });
    await expect(service.isContentEditingLocked()).resolves.toBe(true);
  });

  it('an existing row is updated, not duplicated', async () => {
    row = {
      id: 4,
      name: CONTENT_EDITING_LOCKED,
      value: 'false',
      auditableFields: { is_active: true, created_by: 3043 },
    };
    await service.setContentEditing(true, 7);
    expect(manager.create).not.toHaveBeenCalled();
    expect(row).toMatchObject({ id: 4, value: 'true' });
    expect(row.auditableFields.created_by).toBe(3043);
  });

  it('only an active row with the text "true" locks', async () => {
    row = {
      name: CONTENT_EDITING_LOCKED,
      value: 'TRUE ',
      auditableFields: { is_active: true },
    };
    await expect(service.isContentEditingLocked()).resolves.toBe(false);
    row = {
      name: CONTENT_EDITING_LOCKED,
      value: 'true',
      auditableFields: { is_active: false },
    };
    await expect(service.isContentEditingLocked()).resolves.toBe(false);
  });
});
