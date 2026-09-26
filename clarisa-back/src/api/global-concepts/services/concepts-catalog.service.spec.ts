import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ConceptsCatalogService,
  toListValue,
} from './concepts-catalog.service';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcCollectionMember } from '../entities/gc-collection.entity';

describe('ConceptsCatalogService', () => {
  let db: FakeManager;
  let service: ConceptsCatalogService;
  let meliaf: GcScheme;

  const concept = (scheme: GcScheme, term_id: number, label: string) =>
    db.seed(GcConcept, {
      scheme_id: scheme.id,
      term_id,
      preferred_label: label,
      language: 'en',
      status: GcConceptStatus.APPROVED,
    });

  beforeEach(() => {
    db = new FakeManager();
    meliaf = db.seed(GcScheme, { code: 'meliaf', title: 'MELIAF' });
    db.seed(GcListValue, {
      scope: '',
      list_code: 'term_type',
      value: 'concept',
      label: 'Concept',
      sort: 0,
      is_active: true,
    });
    const ds = fakeDataSource(db);
    service = new ConceptsCatalogService(
      ds,
      new ConceptsAdminService(ds, new ConceptGraphLoader()),
    );
  });

  it('slugs labels like the seed', () => {
    expect(toListValue('IA (ex ante)')).toBe('ia_ex_ante');
  });

  it('creates a collection and keeps members inside its scheme (V33)', async () => {
    const other = db.seed(GcScheme, { code: 'prms', title: 'PRMS' });
    concept(meliaf, 1, 'Outcome');
    concept(meliaf, 2, 'Output');
    concept(other, 3, 'Foreign');
    await service.createCollection('meliaf', {
      code: 'Core',
      label: 'Core terms',
      ordered: true,
    });
    await expect(
      service.createCollection('meliaf', { code: 'core', label: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.setMembers('meliaf', 'core', { term_ids: [1, 3] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const c = await service.setMembers('meliaf', 'core', {
      term_ids: [2, 1, 2],
    });
    expect(c.members.map((m) => m.term_id)).toEqual([2, 1]);
    expect(db.rows(GcCollectionMember).map((m) => m.position)).toEqual([1, 2]);
    await service.deleteCollection('meliaf', 'core');
    expect(db.rows(GcCollectionMember)).toHaveLength(0);
    await expect(
      service.updateCollection('meliaf', 'core', { label: 'y' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds list values with an immutable slug and refuses duplicates', async () => {
    const v = await service.addListValue('meliaf', {
      list_code: 'term_type',
      label: 'Data source',
    });
    expect(v).toMatchObject({ value: 'data_source', sort: 1, shared: false });
    await expect(
      service.addListValue('meliaf', {
        list_code: 'term_type',
        label: 'Concept',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.addListValue('meliaf', { list_code: 'colour', label: 'Red' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const off = await service.updateListValue('meliaf', v.id, {
      is_active: false,
      label: 'Data sources',
    });
    expect(off).toMatchObject({
      value: 'data_source',
      is_active: false,
      label: 'Data sources',
    });
  });

  it('does not let a scheme edit another scheme-scoped value', async () => {
    const row = db.seed(GcListValue, {
      scope: 'prms',
      list_code: 'term_type',
      value: 'kpi',
      label: 'KPI',
      sort: 0,
      is_active: true,
    });
    await expect(
      service.updateListValue('meliaf', row.id, { label: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
