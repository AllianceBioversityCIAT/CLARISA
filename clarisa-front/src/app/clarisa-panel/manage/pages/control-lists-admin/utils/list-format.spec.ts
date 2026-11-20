import { FieldRow, ListRow } from '../models/control-lists.models';
import { shortDate, filterableFields, ownerLabel, relationCount, relationTargets, statusLabel } from './list-format';

const f = (over: Partial<FieldRow>): FieldRow =>
  ({ type: 'text', is_indexed: 0, is_unique: 0, is_required: 0, status: 'published', ...over }) as FieldRow;
const l = (over: Partial<ListRow>): ListRow => ({ id: 1, owner_role_id: 1, status: 'published', ...over }) as ListRow;

describe('list format', () => {
  it('resolves the owner acronym, falling back to the role number', () => {
    const owners = [{ id: 2, acronym: 'CL_DESIGNER', description: '' }];
    expect(ownerLabel(owners, 2)).toBe('CL_DESIGNER');
    expect(ownerLabel(owners, 9)).toBe('Role #9');
  });

  it('counts relation fields and names the status', () => {
    expect(relationCount([f({ type: 'relation' }), f({}), f({ type: 'relation' })])).toBe(2);
    expect(statusLabel({ status: 'draft' })).toBe('Draft');
    expect(statusLabel({ status: 'published' })).toBe('Published');
  });

  it('treats indexed, unique and relation fields as filterable', () => {
    const fields = [f({ code: 'a', is_indexed: 1 }), f({ code: 'b', is_unique: 1 }), f({ code: 'c', type: 'relation' }), f({ code: 'd' })];
    expect(filterableFields(fields).map(x => x.code)).toEqual(['a', 'b', 'c']);
  });

  it('offers only published lists of the same owner, never the list itself', () => {
    const lists = [l({ id: 1 }), l({ id: 2 }), l({ id: 3, owner_role_id: 2 }), l({ id: 4, status: 'draft' })];
    expect(relationTargets(lists, { id: 1, owner_role_id: 1 }).map(x => x.id)).toEqual([2]);
  });

  it('shortens timestamps to a date and never throws on a bad one', () => {
    expect(shortDate('2026-11-18T10:00:00.000Z')).toBe('2026-11-18');
    expect(shortDate('2026-11-18 10:00:00')).toBe('2026-11-18');
    expect(shortDate('2026-11-18')).toBe('2026-11-18');
    // The viewer's day, not the UTC one: 23:30 local is still the 18th.
    expect(shortDate(new Date(2026, 10, 18, 23, 30).toISOString())).toBe('2026-11-18');
    expect(shortDate(null)).toBe('—');
    expect(shortDate('garbage')).toBe('—');
  });
});
