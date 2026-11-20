import { BadRequestException } from '@nestjs/common';
import {
  assertFieldCode,
  assertListCode,
  coerceValue,
  formatValue,
  valueChangesOnRetype,
} from './field-types';

describe('control lists · field types', () => {
  describe('coerceValue (public filters and record writes)', () => {
    // Review 2026-11-13, defect A: `?vigente=true` answered the inactive
    // record, `?edad=abc` the one aged 0 and `?edad=5x` the one aged 5,
    // because the raw text reached MySQL.
    it('turns true/false into 1/0 for a boolean, and refuses anything else', () => {
      expect(coerceValue('boolean', 'true', 'Active')).toBe(1);
      expect(coerceValue('boolean', 'false', 'Active')).toBe(0);
      expect(coerceValue('boolean', '1', 'Active')).toBe(1);
      expect(() => coerceValue('boolean', 'yes', 'Active')).toThrow(
        BadRequestException,
      );
    });

    it('refuses a whole number with letters instead of letting MySQL read 0 or 5', () => {
      expect(() => coerceValue('integer', 'abc', 'Age')).toThrow(
        BadRequestException,
      );
      expect(() => coerceValue('integer', '5x', 'Age')).toThrow(
        BadRequestException,
      );
      expect(coerceValue('integer', '5', 'Age')).toBe(5);
      expect(coerceValue('relation', '12', 'Type')).toBe(12);
    });

    it('refuses decimals that do not fit DECIMAL(18,4)', () => {
      expect(coerceValue('decimal', '12.5', 'Price')).toBe('12.5');
      expect(() => coerceValue('decimal', '1.23456', 'Price')).toThrow(
        BadRequestException,
      );
      expect(() => coerceValue('decimal', '123456789012345', 'Price')).toThrow(
        BadRequestException,
      );
      expect(() => coerceValue('decimal', ' ', 'Price')).not.toThrow(); // empty → null
      expect(coerceValue('decimal', ' ', 'Price')).toBeNull();
    });

    it('checks dates by format and by calendar', () => {
      expect(coerceValue('date', '2026-11-13', 'Day')).toBe('2026-11-13');
      expect(() => coerceValue('date', '2026-13-40', 'Day')).toThrow(
        BadRequestException,
      );
      expect(coerceValue('datetime', '2026-11-13T18:45', 'At')).toBe(
        '2026-11-13 18:45',
      );
      expect(() => coerceValue('datetime', '2026-11-13', 'At')).toThrow(
        BadRequestException,
      );
    });

    it('refuses arrays and objects (`?x=1&x=2`, `?x[y]=1`)', () => {
      expect(() => coerceValue('text', ['a', 'b'], 'Name')).toThrow(
        BadRequestException,
      );
      expect(() => coerceValue('text', { y: '1' }, 'Name')).toThrow(
        BadRequestException,
      );
    });

    it('keeps text lengths inside the column', () => {
      expect(() => coerceValue('text', 'x'.repeat(256), 'Name')).toThrow(
        BadRequestException,
      );
      expect(coerceValue('text', 'x'.repeat(255), 'Name')).toHaveLength(255);
      expect(() => coerceValue('email', 'not-an-email', 'Mail')).toThrow(
        BadRequestException,
      );
      expect(() => coerceValue('url', 'ftp://x', 'Link')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('review 2026-11-17', () => {
    it('keeps decimals exact: validated text, at most 15 significant digits', () => {
      expect(coerceValue('decimal', '12345678901.2345', 'Amount')).toBe(
        '12345678901.2345',
      );
      expect(() =>
        coerceValue('decimal', '12345678901234.5678', 'Amount'),
      ).toThrow(BadRequestException);
    });

    it('refuses dates that do not exist instead of rolling them over', () => {
      expect(() => coerceValue('date', '2026-02-30', 'Day')).toThrow(
        BadRequestException,
      );
      expect(() => coerceValue('datetime', '2026-11-13 25:00', 'At')).toThrow(
        BadRequestException,
      );
      expect(coerceValue('date', '2028-02-29', 'Day')).toBe('2028-02-29');
    });

    it('counts text that is not in canonical form as changing', () => {
      expect(valueChangesOnRetype('integer', '007', 'text')).toBe(true);
      expect(valueChangesOnRetype('integer', '+5', 'text')).toBe(true);
      expect(valueChangesOnRetype('integer', '12.0000', 'text')).toBe(true);
      expect(valueChangesOnRetype('integer', '12.0000', 'decimal')).toBe(false);
      expect(valueChangesOnRetype('integer', '42', 'text')).toBe(false);
      expect(valueChangesOnRetype('decimal', '00.5', 'text')).toBe(true);
      expect(valueChangesOnRetype('boolean', '1.0', 'text')).toBe(true);
    });

    it('reserves `version`, which CLARISA reads on every route', () => {
      expect(() => assertFieldCode('version')).toThrow(BadRequestException);
    });
  });

  describe('valueChangesOnRetype (type change pre-check)', () => {
    // Defect I: 12.5 became 13 and 2026-11-13 18:45 lost its time, both 200.
    it('counts a decimal with a fraction as changing to a whole number', () => {
      expect(valueChangesOnRetype('integer', '12.5000')).toBe(true);
      expect(valueChangesOnRetype('integer', '12.0000')).toBe(false);
      expect(valueChangesOnRetype('integer', '7')).toBe(false);
    });

    it('counts a datetime with a time as changing to a date', () => {
      expect(valueChangesOnRetype('date', '2026-11-13 18:45:00')).toBe(true);
      expect(valueChangesOnRetype('date', '2026-11-13 00:00:00')).toBe(false);
      expect(valueChangesOnRetype('datetime', '2026-11-13')).toBe(false);
    });

    it('counts text that MySQL cannot convert', () => {
      expect(valueChangesOnRetype('integer', 'abc')).toBe(true);
      expect(valueChangesOnRetype('decimal', '12.34567')).toBe(true);
      expect(valueChangesOnRetype('decimal', '12.5')).toBe(false);
      expect(valueChangesOnRetype('boolean', '2')).toBe(true);
      expect(valueChangesOnRetype('boolean', '1')).toBe(false);
      expect(valueChangesOnRetype('text', 'x'.repeat(300))).toBe(true);
      expect(valueChangesOnRetype('long_text', 'x'.repeat(300))).toBe(false);
      expect(valueChangesOnRetype('email', 'nobody')).toBe(true);
    });
  });

  describe('formatValue (public contract)', () => {
    it('answers booleans as true/false and numbers as numbers', () => {
      expect(formatValue('boolean', 1)).toBe(true);
      expect(formatValue('boolean', 0)).toBe(false);
      expect(formatValue('integer', '5')).toBe(5);
      expect(formatValue('decimal', 12.5)).toBe(12.5);
      expect(formatValue('date', '2026-11-13')).toBe('2026-11-13');
      expect(formatValue('text', null)).toBeNull();
    });
  });

  describe('length before any pattern', () => {
    it('refuses a huge value at once, whatever the type (the e-mail pattern backtracks)', () => {
      const evil = 'a@' + '.'.repeat(200_000) + '@';
      const started = Date.now();
      expect(() => coerceValue('email', evil, 'Contact')).toThrow(
        /"Contact" admits 255 characters at most/,
      );
      expect(() =>
        coerceValue('url', 'https://' + 'x'.repeat(600), 'Site'),
      ).toThrow(/500 characters at most/);
      expect(() => coerceValue('integer', '1'.repeat(5_000), 'Age')).toThrow(
        /64 characters at most/,
      );
      expect(Date.now() - started).toBeLessThan(200);
      expect(coerceValue('email', 'maize@example.org', 'Contact')).toBe(
        'maize@example.org',
      );
    });
  });

  describe('long text', () => {
    it('is measured in bytes, the way the column holds it', () => {
      // 25,000 CJK characters: within the 65,000-character limit, 75,000 bytes.
      expect(() =>
        coerceValue('long_text', '字'.repeat(25_000), 'Note'),
      ).toThrow(
        /"Note" is too long: .* needs 75000 bytes of the 65535 a long text holds\./,
      );
      expect(
        coerceValue('long_text', '字'.repeat(20_000), 'Note'),
      ).toHaveLength(20_000);
      expect(() =>
        coerceValue('long_text', 'n'.repeat(65_001), 'Note'),
      ).toThrow(/65000 characters at most/);
    });
  });

  describe('codes', () => {
    it('refuses system columns, reserved words and query parameters as field codes', () => {
      for (const bad of [
        'id',
        'is_active',
        'request_id',
        'select',
        'show',
        'expand',
        'Tipo',
        '1x',
        '',
      ]) {
        expect(() => assertFieldCode(bad)).toThrow(BadRequestException);
      }
      expect(() => assertFieldCode('tipo_suelo')).not.toThrow();
    });

    it('refuses the one name every JavaScript object already answers to', () => {
      // A record that did not send `constructor` would read Object's own: the
      // text of a function ended up stored in the field.
      expect(() => assertFieldCode('constructor')).toThrow(/reserved word/);
      expect(() => assertListCode('constructor')).toThrow(/reserved word/);
      // Every other inherited property carries capitals or underscores, which no code can.
      for (const name of Object.getOwnPropertyNames(Object.prototype))
        expect(() => assertFieldCode(name)).toThrow(BadRequestException);
    });

    it('refuses list codes that would shadow a route', () => {
      expect(() => assertListCode('admin')).toThrow(BadRequestException);
      expect(() => assertListCode('get')).toThrow(BadRequestException);
      // Their tables would be cl_lists, cl_fields and cl_schema_ops: the catalog.
      for (const c of ['lists', 'fields', 'schema_ops'])
        expect(() => assertListCode(c)).toThrow(BadRequestException);
      expect(() => assertListCode('soil_types')).not.toThrow();
    });
  });
});
