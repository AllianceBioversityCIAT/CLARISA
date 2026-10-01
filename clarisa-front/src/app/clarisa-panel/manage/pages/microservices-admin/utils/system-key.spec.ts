import { keyRecordSystemKey, NO_KEY_SYSTEM, systemFilterParams, systemKeyOf } from './system-key';

describe('system-key', () => {
  it('prefers the system_key the back sends', () => {
    expect(systemKeyOf({ system_key: 'key:12', mis_id: null, api_key_id: 12 })).toBe('key:12');
    expect(systemKeyOf({ system_key: 'mis:3', mis_id: 3 })).toBe('mis:3');
  });

  it('rebuilds it from mis_id / api_key_id for an older back', () => {
    expect(systemKeyOf({ mis_id: 3, api_key_id: 1 })).toBe('mis:3');
    expect(systemKeyOf({ mis_id: null, api_key_id: 12 })).toBe('key:12');
    expect(systemKeyOf({ mis_id: null })).toBe(NO_KEY_SYSTEM);
  });

  it('a key record counts toward its MIS, or toward itself without one', () => {
    expect(keyRecordSystemKey({ id: 1, mis_id: 3 })).toBe('mis:3');
    expect(keyRecordSystemKey({ id: 12, mis_id: null })).toBe('key:12');
    expect(keyRecordSystemKey({ id: 13 })).toBe('key:13');
  });

  it('splits a selection into mis_ids and key_ids', () => {
    expect(systemFilterParams(['mis:3', 'key:12', 'mis:5', 'key:40'])).toEqual({ mis_ids: '3,5', key_ids: '12,40' });
    expect(systemFilterParams(['mis:3'])).toEqual({ mis_ids: '3' });
    expect(systemFilterParams(['key:12'])).toEqual({ key_ids: '12' });
    expect(systemFilterParams([NO_KEY_SYSTEM])).toEqual({ mis_ids: '0' });
    expect(systemFilterParams(['mis:3', NO_KEY_SYSTEM])).toEqual({ mis_ids: '3,0' });
    expect(systemFilterParams([])).toEqual({});
  });
});
