import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';
import { ConceptsFieldsService } from './concepts-fields.service';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptsReadService } from './concepts-read.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { GcHistory, GcHistoryAction } from '../entities/gc-history.entity';
import { UpdateFieldDto } from '../dto/field.dto';
import { CreateConceptDto } from '../dto/concept-admin.dto';
import { IMPORT_FIELDS } from '../utils/import-fields';

const actor = { email: 'admin@cgiar.org', action: GcHistoryAction.DIRECT_EDIT };

/** The pipe the admin controller runs on every body. */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const body = (metatype: any): ArgumentMetadata => ({ type: 'body', metatype });

describe('Custom fields', () => {
  let db: FakeManager;
  let fields: ConceptsFieldsService;
  let admin: ConceptsAdminService;
  let read: ConceptsReadService;
  let meliaf: GcScheme;

  const concept = (term_id: number, more: Partial<GcConcept> = {}) =>
    db.seed(GcConcept, {
      scheme_id: meliaf.id,
      term_id,
      preferred_label: `Term ${term_id}`,
      language: 'en',
      status: GcConceptStatus.APPROVED,
      version: '1.0',
      replaced_by_id: null,
      meliaf_function: [],
      meliaf_phase_also: [],
      validated_by: [],
      ai_generated_fields: [],
      extra: {},
      ...more,
    });

  beforeEach(() => {
    db = new FakeManager();
    meliaf = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 50,
      uri_base: null,
    });
    for (const [value, label] of [
      ['africa', 'Africa'],
      ['asia', 'Asia'],
    ])
      db.seed(GcListValue, {
        scope: '',
        list_code: 'region',
        value,
        label,
        sort: 0,
        is_active: true,
      });
    db.seed(GcListValue, {
      scope: '',
      list_code: 'language',
      value: 'en',
      label: 'en',
      sort: 0,
      is_active: true,
    });
    const ds = fakeDataSource(db);
    const loader = new ConceptGraphLoader();
    admin = new ConceptsAdminService(ds, loader);
    fields = new ConceptsFieldsService(ds, admin, loader);
    read = new ConceptsReadService(ds, loader);
  });

  // ---------------------------------------------------------- definitions

  describe('definitions', () => {
    it('creates a field with defaults and lists active and inactive ones', async () => {
      const f = await fields.create('meliaf', {
        code: ' Owner_Unit ',
        label: 'Owner unit',
        type: GcFieldType.TEXT,
      });
      expect(f).toMatchObject({
        code: 'owner_unit',
        required: false,
        is_public: true,
        is_active: true,
        sort: 0,
        list_code: null,
      });
      const g = await fields.create('meliaf', {
        code: 'region',
        label: 'Region',
        type: GcFieldType.LIST,
        list_code: 'region',
      });
      expect(g.sort).toBe(1);
      await fields.update('meliaf', f.id, { is_active: false });
      expect((await fields.list('meliaf')).map((x) => x.code)).toEqual([
        'owner_unit',
        'region',
      ]);
    });

    it.each(['deprecation_reason', '_hidden', '9lives', 'with space', ''])(
      'refuses the code %j',
      async (code) => {
        await expect(
          fields.create('meliaf', {
            code,
            label: 'X',
            type: GcFieldType.TEXT,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('refuses a duplicate code in the same scheme', async () => {
      const dto = { code: 'owner', label: 'Owner', type: GcFieldType.TEXT };
      await fields.create('meliaf', dto);
      await expect(fields.create('meliaf', dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('needs an existing list for list types and refuses one elsewhere', async () => {
      await expect(
        fields.create('meliaf', {
          code: 'r',
          label: 'R',
          type: GcFieldType.MULTI_LIST,
        }),
      ).rejects.toThrow(/needs list_code/);
      await expect(
        fields.create('meliaf', {
          code: 'r',
          label: 'R',
          type: GcFieldType.LIST,
          list_code: 'planets',
        }),
      ).rejects.toThrow(/no list "planets"/);
      await expect(
        fields.create('meliaf', {
          code: 'r',
          label: 'R',
          type: GcFieldType.TEXT,
          list_code: 'region',
        }),
      ).rejects.toThrow(/Only list/);
    });

    it('keeps code and type immutable: the PATCH body refuses them, the service never reads them', async () => {
      await expect(
        pipe.transform({ code: 'renamed' }, body(UpdateFieldDto)),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe.transform({ type: 'number' }, body(UpdateFieldDto)),
      ).rejects.toBeInstanceOf(BadRequestException);
      const f = await fields.create('meliaf', {
        code: 'owner',
        label: 'Owner',
        type: GcFieldType.TEXT,
      });
      const out = await fields.update('meliaf', f.id, {
        label: 'Owning unit',
        required: true,
        code: 'x',
        type: GcFieldType.NUMBER,
      } as any);
      expect(out).toMatchObject({
        code: 'owner',
        type: GcFieldType.TEXT,
        label: 'Owning unit',
        required: true,
      });
    });

    it('publishes only active + public definitions, in sort order', async () => {
      const a = await fields.create('meliaf', {
        code: 'b_field',
        label: 'B',
        type: GcFieldType.TEXT,
        sort: 2,
      });
      await fields.create('meliaf', {
        code: 'a_field',
        label: 'A',
        type: GcFieldType.URL,
        sort: 1,
        help: 'A link',
      });
      await fields.create('meliaf', {
        code: 'private',
        label: 'P',
        type: GcFieldType.TEXT,
        is_public: false,
      });
      expect(await read.fields('meliaf')).toEqual([
        {
          code: 'a_field',
          label: 'A',
          type: 'url',
          list_code: null,
          help: 'A link',
        },
        {
          code: 'b_field',
          label: 'B',
          type: 'text',
          list_code: null,
          help: null,
        },
      ]);
      await fields.update('meliaf', a.id, { is_active: false });
      expect((await read.fields('meliaf')).map((f) => f.code)).toEqual([
        'a_field',
      ]);
    });

    it('lists built-in import targets plus x:<code> per active field', async () => {
      await fields.create('meliaf', {
        code: 'owner',
        label: 'Owner',
        type: GcFieldType.TEXT,
      });
      const off = await fields.create('meliaf', {
        code: 'old',
        label: 'Old',
        type: GcFieldType.TEXT,
      });
      await fields.update('meliaf', off.id, { is_active: false });
      const out = await fields.importFields('meliaf');
      expect(out).toHaveLength(IMPORT_FIELDS.length + 1);
      expect(out[out.length - 1]).toMatchObject({
        field: 'x:owner',
        custom: true,
        type: 'text',
      });
    });
  });

  // --------------------------------------------------------------- values

  describe('values on concepts', () => {
    beforeEach(async () => {
      await fields.create('meliaf', {
        code: 'owner',
        label: 'Owner',
        type: GcFieldType.TEXT,
        sort: 1,
      });
      await fields.create('meliaf', {
        code: 'see_also',
        label: 'See also',
        type: GcFieldType.TERM_LINK,
        sort: 2,
      });
      await fields.create('meliaf', {
        code: 'internal_code',
        label: 'Internal code',
        type: GcFieldType.TEXT,
        is_public: false,
      });
    });

    it('accepts extra in the concept DTO', async () => {
      const dto = await pipe.transform(
        { preferred_label: 'X', extra: { owner: 'PPT' } },
        body(CreateConceptDto),
      );
      expect(dto.extra).toEqual({ owner: 'PPT' });
    });

    it('validates on create and enforces required fields', async () => {
      await expect(
        admin.create(
          'meliaf',
          { preferred_label: 'X', extra: { nope: 1 } },
          actor,
        ),
      ).rejects.toThrow(/Unknown custom field/);
      await fields.create('meliaf', {
        code: 'must',
        label: 'Must',
        type: GcFieldType.TEXT,
        required: true,
      });
      await expect(
        admin.create('meliaf', { preferred_label: 'Y' }, actor),
      ).rejects.toThrow(/missing: must/);
      const ok = await admin.create(
        'meliaf',
        { preferred_label: 'Z', extra: { must: 'yes', owner: 'PPT' } },
        actor,
      );
      expect(ok.extra).toEqual({ must: 'yes', owner: 'PPT' });
    });

    it('merges on update, logs the diff and bumps a published concept', async () => {
      const c = concept(1, {
        extra: { owner: 'PPT', deprecation_reason: 'kept' },
      });
      concept(2);
      await admin.update(
        'meliaf',
        1,
        { extra: { see_also: [2], internal_code: 'Z9' } },
        actor,
      );
      expect(c.extra).toEqual({
        owner: 'PPT',
        deprecation_reason: 'kept',
        see_also: [2],
        internal_code: 'Z9',
      });
      expect(c.version).toBe('1.1');
      const log = db.rows(GcHistory).at(-1)!;
      expect(log.changes.extra.to).toMatchObject({ see_also: [2] });
      // A save that does not send extra leaves it alone.
      await admin.update('meliaf', 1, { definition: 'Now defined' }, actor);
      expect(c.extra.owner).toBe('PPT');
    });

    it('refuses a term_link to a concept of another scheme or that does not exist', async () => {
      concept(1);
      const other = db.seed(GcScheme, {
        code: 'other',
        title: 'Other',
        default_language: 'en',
        next_term_id: 1,
      });
      db.seed(GcConcept, {
        scheme_id: other.id,
        term_id: 2,
        preferred_label: 'Elsewhere',
        language: 'en',
        status: GcConceptStatus.APPROVED,
        version: '1.0',
      });
      await expect(
        admin.update('meliaf', 1, { extra: { see_also: [2] } }, actor),
      ).rejects.toThrow(/no concept with term_id 2/);
    });

    it('publishes custom_fields (public ones only, term links resolved) and never the raw extra', async () => {
      concept(1, {
        extra: {
          owner: 'PPT',
          see_also: [2, 3],
          internal_code: 'SECRET-9',
          deprecation_reason: 'x',
        },
      });
      concept(2);
      concept(3, { status: GcConceptStatus.DRAFT });
      const pub = await read.get('meliaf', 1);
      expect(pub.custom_fields).toEqual([
        { code: 'owner', label: 'Owner', type: 'text', value: 'PPT' },
        {
          code: 'see_also',
          label: 'See also',
          type: 'term_link',
          value: [
            {
              term_id: 2,
              preferred_label: 'Term 2',
              uri: 'https://api.clarisa.cgiar.org/concepts/meliaf/2',
            },
          ],
        },
      ]);
      expect((pub as any).extra).toBeUndefined();
      expect(JSON.stringify(pub)).not.toContain('SECRET-9');
      // A concept without values still lists the public fields, empty.
      expect((await read.get('meliaf', 2)).custom_fields).toEqual([
        { code: 'owner', label: 'Owner', type: 'text', value: null },
        { code: 'see_also', label: 'See also', type: 'term_link', value: [] },
      ]);
      // The admin shape keeps the raw object.
      expect((await admin.get('meliaf', 1)).extra.internal_code).toBe(
        'SECRET-9',
      );
    });

    it('publishes the history of public custom fields only, as x:<code>', async () => {
      concept(1, { extra: { owner: 'PPT' } });
      await admin.update(
        'meliaf',
        1,
        { extra: { owner: 'MEL CoP', internal_code: 'SECRET-9' } },
        actor,
      );
      const [entry] = await read.history('meliaf', 1);
      expect(entry.changes).toEqual({
        'x:owner': { from: 'PPT', to: 'MEL CoP' },
      });
      expect(JSON.stringify(entry)).not.toContain('SECRET-9');
    });

    it('takes the sent AI marks as the full list, and keeps them when not sent', async () => {
      const c = concept(1, { ai_generated_fields: ['scope_note'] });
      await admin.update(
        'meliaf',
        1,
        {
          short_definition: 'Short',
          ai_generated_fields: ['scope_note', 'short_definition'],
        },
        actor,
      );
      expect(c.ai_generated_fields).toEqual(['scope_note', 'short_definition']);
      await admin.update('meliaf', 1, { definition: 'Changed' }, actor);
      expect(c.ai_generated_fields).toEqual(['scope_note', 'short_definition']);
      // The editor rewrote the scope note by hand: the front sends the list without it.
      await admin.update(
        'meliaf',
        1,
        { scope_note: 'By hand', ai_generated_fields: ['short_definition'] },
        actor,
      );
      expect((await read.get('meliaf', 1)).ai_generated_fields).toEqual([
        'short_definition',
      ]);
    });

    it('keeps working for a concept whose extra is null', async () => {
      concept(1, { extra: null as any });
      await admin.update('meliaf', 1, { definition: 'Fine' }, actor);
      await admin.update('meliaf', 1, { extra: { owner: 'PPT' } }, actor);
      expect(db.rows(GcConcept)[0].extra).toEqual({ owner: 'PPT' });
      expect(db.rows(GcField)).toHaveLength(3);
    });
  });
});
