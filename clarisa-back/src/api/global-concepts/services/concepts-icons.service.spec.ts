import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConceptsIconsService } from './concepts-icons.service';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptsReadService } from './concepts-read.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcIcon } from '../entities/gc-icon.entity';
import { GcHistory, GcHistoryAction } from '../entities/gc-history.entity';
import { CreateGlobalConcepts1790500000000 } from '../../../../migrations/1790500000000-CreateGlobalConcepts';
import { DropMeliafFromConcepts1790600500000 } from '../../../../migrations/1790600500000-DropMeliafFromConcepts';

const { toValue } = CreateGlobalConcepts1790500000000;

const actor = { email: 'admin@cgiar.org', action: GcHistoryAction.DIRECT_EDIT };

describe('ConceptsIconsService', () => {
  let db: FakeManager;
  let service: ConceptsIconsService;
  let read: ConceptsReadService;
  let concepts: GcScheme;

  const concept = (term_id: number, status = GcConceptStatus.APPROVED) =>
    db.seed(GcConcept, {
      scheme_id: concepts.id,
      term_id,
      preferred_label: `Term ${term_id}`,
      language: 'en',
      status,
      version: '1.0',
      replaced_by_id: null,
      functions: [],
      phase_also: [],
      validated_by: [],
      ai_generated_fields: [],
      extra: {},
    });

  beforeEach(() => {
    db = new FakeManager();
    concepts = db.seed(GcScheme, {
      code: 'concepts',
      title: 'Concepts',
      default_language: 'en',
      next_term_id: 1,
      uri_base: null,
    });
    for (const [list, labels] of Object.entries(
      DropMeliafFromConcepts1790600500000.currentLists(
        CreateGlobalConcepts1790500000000.LISTS,
      ),
    ))
      labels.forEach((label, sort) =>
        db.seed(GcListValue, {
          scope: '',
          list_code: list,
          value: toValue(label),
          label,
          sort,
          is_active: true,
        }),
      );
    const ds = fakeDataSource(db);
    const loader = new ConceptGraphLoader();
    service = new ConceptsIconsService(
      ds,
      new ConceptsAdminService(ds, loader),
    );
    read = new ConceptsReadService(ds, loader);
  });

  it('attaches an icon, stores list values, logs it and bumps a published concept', async () => {
    const c = concept(7);
    const icon = await service.create(
      'concepts',
      7,
      {
        icon_code: 'IC7',
        icon_status: 'Draft',
        file_format: 'SVG',
        file_link_primary: 'https://cdn.example.org/ic7.svg',
        year_created: 2026,
      },
      actor,
    );
    expect(icon).toMatchObject({
      term_id: 7,
      concept_id: c.id,
      icon_status: 'draft',
      file_format: 'svg',
      year_created: 2026,
    });
    expect(c.version).toBe('1.1');
    const [log] = db.rows(GcHistory);
    expect(log.action).toBe(GcHistoryAction.ICONS);
    expect(log.changes.icon.from).toBeNull();
    expect(log.changes.icon.to).toMatchObject({ icon_code: 'IC7' });
    expect(await service.list('concepts', 7)).toHaveLength(1);
  });

  it('does not bump the version of a draft concept', async () => {
    const c = concept(8, GcConceptStatus.DRAFT);
    await service.create('concepts', 8, { icon_status: 'draft' }, actor);
    expect(c.version).toBe('1.0');
    expect(db.rows(GcHistory)).toHaveLength(1);
  });

  it('refuses a final icon without alt text, on create and on a status-only PATCH', async () => {
    concept(7);
    await expect(
      service.create('concepts', 7, { icon_status: 'final' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    const draft = await service.create(
      'concepts',
      7,
      { icon_status: 'draft' },
      actor,
    );
    await expect(
      service.update('concepts', draft.id, { icon_status: 'Final' }, actor),
    ).rejects.toThrow(/alt text/);
    const ok = await service.update(
      'concepts',
      draft.id,
      { icon_status: 'Final', alt_text: 'A handshake' },
      actor,
    );
    expect(ok.icon_status).toBe('final');
    // Emptying the alt text of a final icon is the same violation.
    await expect(
      service.update('concepts', draft.id, { alt_text: '' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a status or format outside the lists', async () => {
    concept(7);
    await expect(
      service.create('concepts', 7, { icon_status: 'shiny' }, actor),
    ).rejects.toThrow(/icon_status list/);
    await expect(
      service.create(
        'concepts',
        7,
        { icon_status: 'draft', file_format: 'GIF' },
        actor,
      ),
    ).rejects.toThrow(/icon_format list/);
  });

  it('logs an update only when something changed, and a delete with what was removed', async () => {
    const c = concept(7);
    const icon = await service.create(
      'concepts',
      7,
      { icon_status: 'draft', icon_code: 'IC7' },
      actor,
    );
    await service.update('concepts', icon.id, { icon_code: 'IC7' }, actor);
    expect(db.rows(GcHistory)).toHaveLength(1);
    await service.update('concepts', icon.id, { icon_code: 'IC8' }, actor);
    expect(db.rows(GcHistory)).toHaveLength(2);
    expect(await service.remove('concepts', icon.id, actor)).toEqual({
      deleted: icon.id,
    });
    expect(db.rows(GcIcon)).toHaveLength(0);
    const last = db.rows(GcHistory)[2];
    expect(last.changes.icon).toMatchObject({
      from: { icon_code: 'IC8' },
      to: null,
    });
    expect(c.version).toBe('1.3');
  });

  it('answers 404 for an icon of a concept in another scheme', async () => {
    const other = db.seed(GcScheme, {
      code: 'other',
      title: 'Other',
      default_language: 'en',
      next_term_id: 1,
    });
    const foreign = db.seed(GcConcept, {
      scheme_id: other.id,
      term_id: 1,
      preferred_label: 'Foreign',
      language: 'en',
      status: GcConceptStatus.APPROVED,
      version: '1.0',
    });
    const icon = db.seed(GcIcon, {
      concept_id: foreign.id,
      icon_status: 'draft',
    });
    await expect(
      service.update('concepts', icon.id, { icon_code: 'X' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.remove('concepts', icon.id, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the concept alias answers 404 for an icon of another concept, and edits its own', async () => {
    concept(7);
    concept(8);
    const icon = await service.create(
      'concepts',
      7,
      { icon_status: 'draft', icon_code: 'IC7' },
      actor,
    );
    await expect(
      service.update('concepts', icon.id, { icon_code: 'X' }, actor, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.remove('concepts', icon.id, actor, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.rows(GcIcon)).toHaveLength(1);
    expect(db.rows(GcIcon)[0].icon_code).toBe('IC7');

    const updated = await service.update(
      'concepts',
      icon.id,
      { icon_code: 'IC7b' },
      actor,
      7,
    );
    expect(updated.icon_code).toBe('IC7b');
    expect(await service.remove('concepts', icon.id, actor, 7)).toEqual({
      deleted: icon.id,
    });
    expect(db.rows(GcIcon)).toHaveLength(0);
  });

  it('publishes icons with an http(s) url only, and no internal column', async () => {
    concept(7);
    await service.create(
      'concepts',
      7,
      {
        icon_status: 'final',
        alt_text: 'Scale',
        file_link_primary: 'https://cdn.example.org/a.svg',
        designer: 'Ana',
        rights_and_licence: 'CC BY 4.0',
      },
      actor,
    );
    db.seed(GcIcon, {
      concept_id: db.rows(GcConcept)[0].id,
      icon_status: 'draft',
      file_link_primary: '\\\\share\\icons\\b.svg',
    });
    const pub = await read.get('concepts', 7);
    expect(pub.icons).toEqual([
      {
        icon_code: null,
        status: 'final',
        format: null,
        alt_text: 'Scale',
        url: 'https://cdn.example.org/a.svg',
        rights_and_licence: 'CC BY 4.0',
        designer: 'Ana',
      },
      expect.objectContaining({ status: 'draft', url: null }),
    ]);
    expect(JSON.stringify(pub.icons)).not.toContain('concept_id');
  });

  it('returns the first icon when the same file is attached again (retry / double submit)', async () => {
    // Two parallel writes are serialised by the scheme row lock in MySQL; the
    // fake manager has no locks, so this covers the retry that lands after it.
    concept(8);
    const body = {
      icon_status: 'Draft',
      file_link_primary: 'https://cdn.example.org/ic8.svg',
    };
    const a = await service.create('concepts', 8, body, actor);
    const b = await service.create('concepts', 8, body, actor);
    expect(b.id).toBe(a.id);
    expect(await service.list('concepts', 8)).toHaveLength(1);
  });

  it('refuses an impossible date_added with a 400, not a database error', async () => {
    concept(9);
    await expect(
      service.create(
        'concepts',
        9,
        { icon_status: 'Draft', date_added: '2026-02-31' },
        actor,
      ),
    ).rejects.toThrow(/real date/);
  });
});
