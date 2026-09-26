import { BadRequestException } from '@nestjs/common';
import { ConceptsImportService, ImportAction } from './concepts-import.service';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import {
  GcLabel,
  GcLabelKind,
  GcLabelStatus,
} from '../entities/gc-label.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import {
  CreateGlobalConcepts1790500000000,
  toValue,
} from '../../../../migrations/1790500000000-CreateGlobalConcepts';

const admin = { email: 'admin@cgiar.org' };

describe('ConceptsImportService', () => {
  let db: FakeManager;
  let service: ConceptsImportService;
  let meliaf: GcScheme;

  const concept = (
    term_id: number,
    label: string,
    extra: Partial<GcConcept> = {},
  ) =>
    db.seed(GcConcept, {
      scheme_id: meliaf.id,
      term_id,
      preferred_label: label,
      language: 'en',
      status: GcConceptStatus.APPROVED,
      version: '1.0',
      replaced_by_id: null,
      definition: null,
      meliaf_function: [],
      meliaf_phase_also: [],
      validated_by: [],
      ai_generated_fields: [],
      extra: {},
      ...extra,
    });

  beforeEach(() => {
    db = new FakeManager();
    meliaf = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 100,
      uri_base: null,
    });
    for (const [list, labels] of Object.entries(
      CreateGlobalConcepts1790500000000.LISTS,
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
    service = new ConceptsImportService(
      ds,
      new ConceptsAdminService(ds, new ConceptGraphLoader()),
    );
  });

  it('plans creates, updates, unchanged and invalid rows without writing', async () => {
    concept(5, 'Outcome', { definition: 'A change' });
    concept(6, 'Output', { definition: 'A product' });
    const r = await service.preview('meliaf', [
      {
        term_id: 5,
        preferred_label: 'Outcome',
        definition: 'A change in behaviour',
      },
      { term_id: 6, preferred_label: 'Output', definition: 'A product' },
      {
        preferred_label: 'Baseline',
        definition: 'Starting point',
        meliaf_function: 'MEL; IA',
      },
      { preferred_label: '', definition: 'orphan' },
      { preferred_label: 'Indicator', meliaf_function: 'Astrology' },
    ]);
    expect(r.rows.map((x) => x.action)).toEqual([
      ImportAction.UPDATE,
      ImportAction.SKIP,
      ImportAction.CREATE,
      ImportAction.INVALID,
      ImportAction.INVALID,
    ]);
    expect(r.rows[0].changes).toEqual(['definition']);
    expect(r.summary).toMatchObject({
      total: 5,
      to_create: 1,
      to_update: 1,
      unchanged: 1,
      invalid: 2,
    });
    expect(db.rows(GcConcept)).toHaveLength(2);
  });

  it('flags a repeated TERM ID and a repeated label in the file', async () => {
    const r = await service.preview('meliaf', [
      { term_id: 7, preferred_label: 'Impact' },
      { term_id: 7, preferred_label: 'Effect' },
      { preferred_label: 'impact' },
    ]);
    expect(r.rows[1].warnings[0]).toMatch(/repeated/);
    expect(r.rows[1].action).toBe(ImportAction.CREATE);
    expect(r.rows[1].term_id).toBeNull();
    expect(r.rows[2].action).toBe(ImportAction.INVALID);
    expect(r.rows[2].errors[0]).toMatch(/Same preferred label as row 1/);
  });

  it('splits SOURCE into derivation, citation and URL (1.10d)', async () => {
    await service.import(
      'meliaf',
      [
        {
          preferred_label: 'Theory of change',
          source_citation:
            'Adapted from OECD (2019) https://oecd.org/dac/glossary.',
        },
      ],
      admin,
    );
    const c = db.rows(GcConcept)[0];
    expect(c.derivation).toBe('adapted_from_source');
    expect(c.source_citation).toBe('OECD (2019)');
    expect(c.source_url).toBe('https://oecd.org/dac/glossary');
  });

  it('never clears a stored field with an empty cell and only adds labels', async () => {
    const c = concept(5, 'Outcome', { definition: 'A change', steward: 'PPU' });
    db.seed(GcLabel, {
      concept_id: c.id,
      label: 'Result',
      language: 'en',
      kind: GcLabelKind.ALT,
      status: GcLabelStatus.ACTIVE,
    });
    await service.import(
      'meliaf',
      [
        {
          term_id: 5,
          preferred_label: 'Outcome',
          definition: '',
          steward: null,
          alternative_labels: 'Effect | Result',
        },
      ],
      admin,
    );
    expect(db.rows(GcConcept)[0]).toMatchObject({
      definition: 'A change',
      steward: 'PPU',
    });
    expect(
      db
        .rows(GcLabel)
        .map((l) => l.label)
        .sort(),
    ).toEqual(['Effect', 'Result']);
  });

  it('links broader terms by label, including rows created by the same import', async () => {
    const r = await service.import(
      'meliaf',
      [
        { preferred_label: 'Evaluation' },
        {
          preferred_label: 'Impact evaluation',
          broader_terms: 'Evaluation; Nowhere',
        },
      ],
      admin,
    );
    const rel = db.rows(GcRelation);
    expect(rel).toHaveLength(1);
    expect(rel[0].kind).toBe(GcRelationKind.BROADER);
    expect(r.rows[1].warnings.join(' ')).toMatch(/"Nowhere" not found/);
  });

  it('refuses an import with invalid rows unless told to skip them', async () => {
    const rows = [{ preferred_label: 'Good' }, { preferred_label: '' }];
    await expect(service.import('meliaf', rows, admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.rows(GcConcept)).toHaveLength(0);
    const r = await service.import('meliaf', rows, admin, true);
    expect(r.summary).toMatchObject({ to_create: 1, invalid: 1 });
    expect(db.rows(GcConcept)).toHaveLength(1);
  });
});
