import { isReservedCode, reservedMessage } from './reserved-codes';

describe('reserved codes', () => {
  it('refuses the MySQL words and public-address parameters for both kinds', () => {
    for (const word of ['select', 'order', 'date', 'show', 'expand', 'dir', 'fields', 'version']) {
      expect(isReservedCode(word, 'field')).toBe(true);
      expect(isReservedCode(word, 'list')).toBe(true);
    }
  });

  it('refuses the system columns as field codes only', () => {
    for (const column of ['id', 'created_at', 'updated_at', 'is_active', 'created_by', 'updated_by', 'modification_justification', 'request_id']) {
      expect(isReservedCode(column, 'field')).toBe(true);
      expect(isReservedCode(column, 'list')).toBe(false);
    }
  });

  it('refuses the module routes as list codes only', () => {
    for (const route of ['admin', 'get', 'lists', 'schema_ops']) {
      expect(isReservedCode(route, 'list')).toBe(true);
      expect(isReservedCode(route, 'field')).toBe(false);
    }
    // `fields` is a route AND a reserved word: it is refused for both.
    expect(isReservedCode('fields', 'field')).toBe(true);
  });

  it('lets an ordinary code through', () => {
    expect(isReservedCode('crop_type', 'field')).toBe(false);
    expect(isReservedCode('crops', 'list')).toBe(false);
  });

  it('writes the message the screen shows', () => {
    expect(reservedMessage('date')).toBe('"date" is a reserved word. Choose another code.');
  });
});
