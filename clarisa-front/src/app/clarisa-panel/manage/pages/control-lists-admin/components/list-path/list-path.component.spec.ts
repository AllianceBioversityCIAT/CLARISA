import { ListDetail } from '../../models/control-lists.models';
import { buildPath, ListPathComponent } from './list-path.component';

const list = (over: Partial<ListDetail> = {}): ListDetail =>
  ({ status: 'draft', rows: 0, pending_changes: 0, fields: [], ...over }) as unknown as ListDetail;
const fields = [{ id: 1 }, { id: 2 }] as unknown as ListDetail['fields'];

describe('the path of a new list', () => {
  it('starts at the fields, with no button: the action is on the tab below', () => {
    const view = buildPath(list());
    expect(view?.current).toBe('fields');
    expect(view?.steps.map(s => s.state)).toEqual(['current', 'next', 'next']);
    expect(view?.action).toBe('');
  });

  it('offers to publish once there is a field, and says how many are ready', () => {
    const view = buildPath(list({ fields }));
    expect(view?.current).toBe('publish');
    expect(view?.steps.map(s => s.state)).toEqual(['done', 'current', 'next']);
    expect(view?.text).toContain('2 fields ready.');
    expect(view?.action).toBe('Publish list');
    expect(buildPath(list({ fields: fields.slice(0, 1) }))?.text).toContain('1 field ready.');
  });

  it('blocks publishing while a change is still being applied', () => {
    const view = buildPath(list({ fields, pending_changes: 1 }));
    expect(view?.blocked).toBe(true);
    expect(view?.text).toBe('A change to this list is still being applied.');
  });

  it('points to the records once published, and leaves when the list has records', () => {
    const view = buildPath(list({ fields, status: 'published' }));
    expect(view?.current).toBe('records');
    expect(view?.steps.map(s => s.state)).toEqual(['done', 'done', 'current']);
    expect(view?.action).toBe('Go to Records');
    expect(buildPath(list({ fields, status: 'published', rows: 1 }))).toBeNull();
  });

  it('emits the action of the current step, never a blocked one', () => {
    const c = new ListPathComponent();
    const publish = jest.fn();
    const records = jest.fn();
    c.publish.subscribe(publish);
    c.records.subscribe(records);

    c.list = list({ fields, pending_changes: 1 });
    c.act();
    expect(publish).not.toHaveBeenCalled();

    c.list = list({ fields });
    c.act();
    expect(publish).toHaveBeenCalledTimes(1);

    c.list = list({ fields, status: 'published' });
    c.act();
    expect(records).toHaveBeenCalledTimes(1);

    c.list = list();
    c.act();
    c.list = null;
    c.act();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(records).toHaveBeenCalledTimes(1);
  });
});
