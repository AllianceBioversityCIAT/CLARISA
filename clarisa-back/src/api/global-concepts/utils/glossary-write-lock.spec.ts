// LDAPAuth reads src/shared/config/config.ts, which is git-ignored and absent in CI;
// this suite only reads the module's metadata (same mock as auth.service.spec).
jest.mock('../../../auth/utils/LDAPAuth', () => ({
  LDAPAuth: jest.fn(),
}));

import { ConflictException, RequestMethod } from '@nestjs/common';
import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  GlobalConceptsModule,
  GlobalConceptsUriModule,
} from '../global-concepts.module';
import { GlobalConceptsAdminController } from '../controllers/global-concepts-admin.controller';
import {
  GlobalConceptsPlatformController,
  GlobalConceptsRequestsController,
} from '../controllers/global-concepts-requests.controller';
import { ConceptsAdminService } from '../services/concepts-admin.service';
import { ConceptsCatalogService } from '../services/concepts-catalog.service';
import {
  ConceptsImportService,
  ImportAction,
} from '../services/concepts-import.service';
import { ConceptsIconsService } from '../services/concepts-icons.service';
import { RequestsService } from '../services/requests.service';
import { OutboxService } from '../services/outbox.service';
import { ConceptGraphLoader } from '../services/concept-graph.loader';
import { FakeManager, fakeDataSource } from './fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import {
  GcCollection,
  GcCollectionMember,
} from '../entities/gc-collection.entity';
import { GcLabel, GcLabelKind } from '../entities/gc-label.entity';
import { GcRelation, GcRelationKind } from '../entities/gc-relation.entity';
import {
  GcMapping,
  GcMappingJustification,
  GcMappingStatus,
  GcMatchType,
} from '../entities/gc-mapping.entity';
import { GcIcon } from '../entities/gc-icon.entity';
import { GcHistory } from '../entities/gc-history.entity';
import {
  GcEmailVerification,
  GcOutbox,
  GcProposal,
  GcProposalEvent,
  GcProposalOrigin,
  GcProposalState,
  GcProposalType,
} from '../entities/gc-proposal.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import { GcRequestAction } from '../dto/request.dto';
import { GLOSSARY_LOCK_MESSAGE } from './glossary-write-lock';
import { CreateGlobalConcepts1790500000000 } from '../../../../migrations/1790500000000-CreateGlobalConcepts';
import { DropMeliafFromConcepts1790600500000 } from '../../../../migrations/1790600500000-DropMeliafFromConcepts';

const { toValue } = CreateGlobalConcepts1790500000000;
const SCHEME = 'meliaf-taxonomy';
const user = { email: 'admin@cgiar.org' } as any;
const platformAuth = { mis: { acronym: 'PRMS' } } as any;

interface World {
  db: FakeManager;
  adminCtl: GlobalConceptsAdminController;
  platformCtl: GlobalConceptsPlatformController;
  requestsCtl: GlobalConceptsRequestsController;
  ids: {
    glossaryTerm: number; // term_id of a glossary concept (391)
    otherTerm: number; // term_id of a concept outside the glossary (500)
    iconId: number;
    mappingId: number;
    proposalId: number;
  };
}

function world(): World {
  const db = new FakeManager();
  const scheme = db.seed(GcScheme, {
    code: SCHEME,
    title: 'MELIAF taxonomy',
    default_language: 'en',
    next_term_id: 600,
    uri_base: null,
    validator_required: false,
    owner_platform: 'prms',
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
  const concept = (term_id: number, label: string) =>
    db.seed(GcConcept, {
      scheme_id: scheme.id,
      term_id,
      preferred_label: label,
      language: 'en',
      status: GcConceptStatus.APPROVED,
      version: '1.0',
      replaced_by_id: null,
      definition: 'Defined.',
      functions: [],
      phase_also: [],
      validated_by: [],
      ai_generated_fields: [],
      extra: {},
    });
  const g1 = concept(391, 'Glossary term one');
  const g2 = concept(392, 'Glossary term two');
  const n1 = concept(500, 'Taxonomy only');
  concept(501, 'Taxonomy only two');
  const glossary = db.seed(GcCollection, {
    scheme_id: scheme.id,
    code: 'glossary',
    label: 'Glossary',
    ordered: false,
  });
  const other = db.seed(GcCollection, {
    scheme_id: scheme.id,
    code: 'other',
    label: 'Other',
    ordered: false,
  });
  for (const c of [g1, g2])
    db.seed(GcCollectionMember, {
      collection_id: glossary.id,
      concept_id: c.id,
      position: null,
    });
  db.seed(GcCollectionMember, {
    collection_id: other.id,
    concept_id: n1.id,
    position: null,
  });
  db.seed(GcRelation, {
    concept_id: Math.min(g1.id, n1.id),
    related_concept_id: Math.max(g1.id, n1.id),
    kind: GcRelationKind.RELATED,
  });
  const mapping = db.seed(GcMapping, {
    concept_id: g1.id,
    target_scheme: 'agrovoc',
    target_uri: 'https://example.org/a',
    target_label: null,
    match_type: GcMatchType.CLOSE,
    justification: GcMappingJustification.MANUAL,
    confidence: null,
    author_email: 'a@cgiar.org',
    reviewed_by_email: 'a@cgiar.org',
    status: GcMappingStatus.APPROVED,
  });
  const icon = db.seed(GcIcon, {
    concept_id: g1.id,
    icon_status: 'draft',
  } as any);
  const proposal = db.seed(GcProposal, {
    scheme_id: scheme.id,
    type: GcProposalType.EDIT,
    state: GcProposalState.IN_REVIEW,
    concept_id: g1.id,
    target_concept_id: null,
    target_scheme_id: null,
    payload: { definition: 'Changed from a request.' },
    base_version: null,
    origin: GcProposalOrigin.CLARISA_USER,
    origin_platform: null,
    requester_email: 'user@cgiar.org',
  } as any);

  const ds = fakeDataSource(db);
  const admin = new ConceptsAdminService(ds, new ConceptGraphLoader());
  const requests = new RequestsService(
    ds,
    admin,
    new OutboxService(ds, {} as any),
  );
  const none = undefined as any;
  const adminCtl = new GlobalConceptsAdminController(
    admin,
    none, // releases
    requests,
    none, // ai
    none, // assist
    new ConceptsImportService(ds, admin),
    new ConceptsCatalogService(ds, admin),
    none, // embeddings
    none, // loader
    ds,
    new ConceptsIconsService(ds, admin),
    none, // fields
    none, // usage
    none, // platformUsage
  );
  const platformCtl = new GlobalConceptsPlatformController(requests, admin);
  const requestsCtl = new GlobalConceptsRequestsController(requests);
  return {
    db,
    adminCtl,
    platformCtl,
    requestsCtl,
    ids: {
      glossaryTerm: 391,
      otherTerm: 500,
      iconId: Number(icon.id),
      mappingId: Number(mapping.id),
      proposalId: Number(proposal.id),
    },
  };
}

/** Every row that belongs to a glossary term (391, 392) or to the glossary collection. */
const snapshot = (db: FakeManager) => {
  const ids = new Set(
    db
      .rows(GcConcept)
      .filter((c) => [391, 392].includes(Number(c.term_id)))
      .map((c) => Number(c.id)),
  );
  const has = (v: unknown) => ids.has(Number(v));
  const glossary = db
    .rows(GcCollection)
    .filter((c) => c.code === 'glossary')
    .map((c) => Number(c.id));
  return JSON.stringify({
    concepts: db.rows(GcConcept).filter((c) => has(c.id)),
    // A concept that names a glossary term as its replacement.
    replacedBy: db.rows(GcConcept).filter((c) => has(c.replaced_by_id)),
    labels: db.rows(GcLabel).filter((l) => has(l.concept_id)),
    relations: db
      .rows(GcRelation)
      .filter((r) => has(r.concept_id) || has(r.related_concept_id)),
    mappings: db.rows(GcMapping).filter((m) => has(m.concept_id)),
    icons: db.rows(GcIcon).filter((i) => has(i.concept_id)),
    history: db.rows(GcHistory).filter((h) => has(h.concept_id)),
    collections: db
      .rows(GcCollection)
      .filter((c) => glossary.includes(Number(c.id))),
    members: db
      .rows(GcCollectionMember)
      .filter(
        (m) => glossary.includes(Number(m.collection_id)) || has(m.concept_id),
      ),
  });
};

const refused = async (call: Promise<unknown>) => {
  const err = await call.then(
    () => null,
    (e) => e,
  );
  expect(err).toBeInstanceOf(ConflictException);
  expect((err as Error).message).toContain(GLOSSARY_LOCK_MESSAGE);
};

type Scenario = (w: World) => Promise<void>;

/** Request bookkeeping rows: a refused submission stores and emails nothing. */
const requestRows = (db: FakeManager) =>
  [GcProposal, GcProposalEvent, GcOutbox, GcEmailVerification].map(
    (t) => db.rows(t as any).length,
  );
const refusedSubmission = async (w: World, call: () => Promise<unknown>) => {
  const before = requestRows(w.db);
  await refused(call());
  expect(requestRows(w.db)).toEqual(before);
};
const edit = (termId: number) => ({
  type: GcProposalType.EDIT,
  term_id: termId,
  payload: { definition: 'Proposed.' },
  rationale: 'Better wording',
});
const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

/**
 * Every write route of the module that could change a glossary term or the
 * glossary collection, with the call that must be refused. Each one also
 * checks that nothing was written (the fake manager has no rollback, so the
 * lock must run before the first write).
 */
const GUARDED: Record<string, Scenario[]> = {
  'GlobalConceptsAdminController.createCollection': [
    (w) =>
      refused(
        w.adminCtl.createCollection(SCHEME, {
          code: 'Glossary',
          label: 'Again',
        }),
      ),
  ],
  'GlobalConceptsAdminController.updateCollection': [
    (w) =>
      refused(
        w.adminCtl.updateCollection(SCHEME, 'glossary', { label: 'Renamed' }),
      ),
  ],
  'GlobalConceptsAdminController.setMembers': [
    (w) =>
      refused(
        w.adminCtl.setMembers(SCHEME, 'glossary', {
          term_ids: [w.ids.otherTerm],
        }),
      ),
    (w) => refused(w.adminCtl.setMembers(SCHEME, 'glossary', { term_ids: [] })),
    // A glossary term joining another collection is also a glossary change.
    (w) =>
      refused(
        w.adminCtl.setMembers(SCHEME, 'other', {
          term_ids: [w.ids.otherTerm, w.ids.glossaryTerm],
        }),
      ),
  ],
  'GlobalConceptsAdminController.deleteCollection': [
    (w) => refused(w.adminCtl.deleteCollection(SCHEME, 'glossary')),
  ],
  'GlobalConceptsAdminController.importPreview': [
    async (w) => {
      const res = await w.adminCtl.importPreview(SCHEME, {
        rows: [
          {
            term_id: w.ids.glossaryTerm,
            preferred_label: 'Renamed by id',
            definition: 'By id.',
          },
          { preferred_label: 'glossary term two', definition: 'By title.' },
          { preferred_label: 'Brand new', definition: 'New.' },
        ],
      } as any);
      expect(res.rows.map((r) => r.action)).toEqual([
        ImportAction.INVALID,
        ImportAction.INVALID,
        ImportAction.CREATE,
      ]);
      expect(res.rows[0].errors).toContain(
        `Term 391 belongs to the glossary. ${GLOSSARY_LOCK_MESSAGE}`,
      );
      expect(res.rows[1].errors).toContain(
        `Term 392 belongs to the glossary. ${GLOSSARY_LOCK_MESSAGE}`,
      );
    },
  ],
  'GlobalConceptsAdminController.importRows': [
    async (w) => {
      // Skipping invalid rows: the glossary row is reported, the rest imports.
      const before = w.db.rows(GcConcept).length;
      const res = await w.adminCtl.importRows(
        SCHEME,
        {
          rows: [
            {
              term_id: w.ids.glossaryTerm,
              preferred_label: 'Glossary term one',
              definition: 'Overwritten?',
            },
            { preferred_label: 'Brand new', definition: 'New.' },
          ],
          skip_invalid: true,
        } as any,
        user,
      );
      expect(res.rows[0].action).toBe(ImportAction.INVALID);
      expect(res.rows[0].errors).toEqual([
        `Term 391 belongs to the glossary. ${GLOSSARY_LOCK_MESSAGE}`,
      ]);
      expect(res.rows[1].action).toBe(ImportAction.CREATE);
      expect(w.db.rows(GcConcept)).toHaveLength(before + 1);
    },
    async (w) => {
      // Without skipping: the whole file is refused, as for any invalid row.
      await expect(
        w.adminCtl.importRows(
          SCHEME,
          {
            rows: [{ preferred_label: 'Glossary term one', definition: 'X' }],
          } as any,
          user,
        ),
      ).rejects.toThrow(/belongs to the glossary/);
    },
  ],
  'GlobalConceptsAdminController.update': [
    (w) =>
      refused(
        w.adminCtl.update(
          SCHEME,
          w.ids.glossaryTerm,
          { definition: 'Changed.' },
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.setStatus': [
    (w) =>
      refused(
        w.adminCtl.setStatus(
          SCHEME,
          w.ids.glossaryTerm,
          { status: GcConceptStatus.DEPRECATED, reason: 'Old' },
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.setLabels': [
    (w) =>
      refused(
        w.adminCtl.setLabels(
          SCHEME,
          w.ids.glossaryTerm,
          { labels: [{ label: 'Alt', kind: GcLabelKind.ALT }] } as any,
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.addRelation': [
    (w) =>
      refused(
        w.adminCtl.addRelation(
          SCHEME,
          w.ids.otherTerm,
          { kind: GcRelationKind.BROADER, target_term_id: w.ids.glossaryTerm },
          user,
        ),
      ),
    (w) =>
      refused(
        w.adminCtl.addRelation(
          SCHEME,
          w.ids.glossaryTerm,
          { kind: GcRelationKind.BROADER, target_term_id: 501 },
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.removeRelation': [
    (w) =>
      refused(
        w.adminCtl.removeRelation(
          SCHEME,
          w.ids.otherTerm,
          { kind: GcRelationKind.RELATED, target_term_id: w.ids.glossaryTerm },
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.upsertMapping': [
    (w) =>
      refused(
        w.adminCtl.upsertMapping(
          SCHEME,
          w.ids.glossaryTerm,
          { target_scheme: 'agrovoc', target_uri: 'https://example.org/b' },
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.removeMapping': [
    (w) =>
      refused(
        w.adminCtl.removeMapping(
          SCHEME,
          w.ids.glossaryTerm,
          w.ids.mappingId,
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.createIcon': [
    (w) =>
      refused(
        w.adminCtl.createIcon(
          SCHEME,
          w.ids.glossaryTerm,
          { icon_status: 'draft' } as any,
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.updateConceptIcon': [
    (w) =>
      refused(
        w.adminCtl.updateConceptIcon(
          SCHEME,
          w.ids.glossaryTerm,
          w.ids.iconId,
          { notes: 'x' } as any,
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.removeConceptIcon': [
    (w) =>
      refused(
        w.adminCtl.removeConceptIcon(
          SCHEME,
          w.ids.glossaryTerm,
          w.ids.iconId,
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.updateIcon': [
    (w) =>
      refused(
        w.adminCtl.updateIcon(
          SCHEME,
          w.ids.iconId,
          { notes: 'x' } as any,
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.removeIcon': [
    (w) => refused(w.adminCtl.removeIcon(SCHEME, w.ids.iconId, user)),
  ],
  'GlobalConceptsAdminController.merge': [
    (w) =>
      refused(
        w.adminCtl.merge(
          SCHEME,
          w.ids.glossaryTerm,
          { into_term_id: w.ids.otherTerm },
          user,
        ),
      ),
    (w) =>
      refused(
        w.adminCtl.merge(
          SCHEME,
          w.ids.otherTerm,
          { into_term_id: w.ids.glossaryTerm },
          user,
        ),
      ),
  ],
  'GlobalConceptsAdminController.transition': [
    (w) =>
      refused(
        w.adminCtl.transition(
          w.ids.proposalId,
          {
            action: GcRequestAction.APPROVE,
            expected_state: GcProposalState.IN_REVIEW,
          },
          user,
        ),
      ),
  ],
  'GlobalConceptsPlatformController.update': [
    (w) =>
      refused(
        w.platformCtl.update(
          SCHEME,
          w.ids.glossaryTerm,
          { definition: 'From a platform.' },
          platformAuth,
        ),
      ),
  ],
  // Submitting a request about a glossary term (as the concept or as the
  // merge target) is refused before anything is stored or emailed.
  'GlobalConceptsRequestsController.start': [
    (w) =>
      refusedSubmission(w, () =>
        w.requestsCtl.start(SCHEME, {
          ...edit(w.ids.glossaryTerm),
          email: 'someone@cgiar.org',
        }),
      ),
  ],
  'GlobalConceptsRequestsController.verify': [
    async (w) => {
      // A draft confirmed by email after the lock shipped.
      w.db.seed(GcEmailVerification, {
        email: 'someone@cgiar.org',
        token_hash: sha256('tok'),
        proposal_draft: { scheme: SCHEME, ...edit(w.ids.glossaryTerm) },
        expires_at: new Date(Date.now() + 3600_000),
        used_at: null,
      } as any);
      const proposals = w.db.rows(GcProposal).length;
      const outbox = w.db.rows(GcOutbox).length;
      await refused(w.requestsCtl.verify({ token: 'tok' }));
      expect(w.db.rows(GcProposal)).toHaveLength(proposals);
      expect(w.db.rows(GcOutbox)).toHaveLength(outbox);
    },
  ],
  'GlobalConceptsRequestsController.submitAsUser': [
    (w) =>
      refusedSubmission(w, () =>
        w.requestsCtl.submitAsUser(SCHEME, edit(w.ids.glossaryTerm), user),
      ),
    (w) =>
      refusedSubmission(w, () =>
        w.requestsCtl.submitAsUser(
          SCHEME,
          {
            type: GcProposalType.DEPRECATE,
            term_id: w.ids.glossaryTerm,
            rationale: 'Old',
          },
          user,
        ),
      ),
    (w) =>
      refusedSubmission(w, () =>
        w.requestsCtl.submitAsUser(
          SCHEME,
          {
            type: GcProposalType.MERGE,
            term_id: w.ids.otherTerm,
            target_term_id: w.ids.glossaryTerm,
            rationale: 'Same thing',
          },
          user,
        ),
      ),
  ],
  'GlobalConceptsPlatformController.submit': [
    (w) =>
      refusedSubmission(w, () =>
        w.platformCtl.submit(
          SCHEME,
          { ...edit(w.ids.glossaryTerm), requester_email: 'p@cgiar.org' },
          platformAuth,
        ),
      ),
    (w) =>
      refusedSubmission(w, () =>
        w.platformCtl.submit(
          SCHEME,
          {
            type: GcProposalType.MERGE,
            term_id: w.ids.glossaryTerm,
            target_term_id: w.ids.otherTerm,
            rationale: 'Same thing',
            requester_email: 'p@cgiar.org',
          },
          platformAuth,
        ),
      ),
  ],
  'GlobalConceptsPlatformController.transition': [
    (w) =>
      refused(
        w.platformCtl.transition(
          w.ids.proposalId,
          {
            action: GcRequestAction.APPROVE,
            expected_state: GcProposalState.IN_REVIEW,
          },
          platformAuth,
        ),
      ),
  ],
};

/**
 * Write routes that cannot change a glossary term or the glossary collection,
 * each with the reason. A new write route has to land in GUARDED (with a
 * refused call) or here (with its reason), or the ratchet below fails.
 */
const NOT_GLOSSARY_WRITES: Record<string, string> = {
  'GlobalConceptsAdminController.mapColumns': 'AI advice, writes nothing',
  'GlobalConceptsAdminController.normalize': 'AI advice, writes nothing',
  'GlobalConceptsAdminController.refreshEmbeddings':
    'writes gc_embeddings only (search vectors), never a concept',
  'GlobalConceptsAdminController.semanticSearch': 'read',
  'GlobalConceptsAdminController.draft': 'AI draft, nothing is saved',
  'GlobalConceptsAdminController.recommend':
    'writes gc_proposals.ai_recommendation only',
  'GlobalConceptsAdminController.addListValue': 'controlled-list values',
  'GlobalConceptsAdminController.updateListValue': 'controlled-list values',
  'GlobalConceptsAdminController.createField': 'custom-field definitions',
  'GlobalConceptsAdminController.updateField': 'custom-field definitions',
  'GlobalConceptsAdminController.create':
    'a new concept is never a member of any collection',
  'GlobalConceptsAdminController.publish':
    'writes a release snapshot and stamps release_id on history rows; no concept or collection changes',
  'GlobalConceptsRequestsController.resubmitPublic':
    'a stored request: payload and rationale only, its concepts were fixed (and checked) at submit; approval is refused by the lock',
  'GlobalConceptsPlatformController.resubmit':
    'a stored request: payload and rationale only, its concepts were fixed (and checked) at submit; approval is refused by the lock',
  'GlobalConceptsPlatformController.create':
    'a new concept is never a member of any collection',
  'GlobalConceptsMcpController.post': 'MCP tools are read-only',
  'GlobalConceptsMcpController.remove': 'answers 405, writes nothing',
  'GlobalConceptsAssistantController.chat': 'AI chat, writes nothing',
  'GlobalConceptsPublicController.suggest': 'read',
};

/** Every non-GET route of the taxonomy modules, as `Controller.method`. */
function writeRoutes(): string[] {
  const controllers: any[] = [
    ...Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, GlobalConceptsModule),
    ...Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      GlobalConceptsUriModule,
    ),
  ];
  const out: string[] = [];
  for (const ctl of controllers) {
    for (const name of Object.getOwnPropertyNames(ctl.prototype)) {
      if (name === 'constructor') continue;
      const handler = ctl.prototype[name];
      if (typeof handler !== 'function') continue;
      if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (method === RequestMethod.GET || method === RequestMethod.HEAD)
        continue;
      out.push(`${ctl.name}.${name}`);
    }
  }
  return out.sort();
}

describe('Glossary write lock (taxonomy routes never change the glossary)', () => {
  it('ratchet: every write route is either guarded (with a refused call) or listed with its reason', () => {
    const routes = writeRoutes();
    expect(routes.length).toBeGreaterThan(30);
    const unclassified = routes.filter(
      (r) => !(r in GUARDED) && !(r in NOT_GLOSSARY_WRITES),
    );
    expect(unclassified).toEqual([]);
    // No stale entries either: a renamed route must be re-classified.
    const stale = [
      ...Object.keys(GUARDED),
      ...Object.keys(NOT_GLOSSARY_WRITES),
    ].filter((k) => !routes.includes(k));
    expect(stale).toEqual([]);
  });

  for (const [route, scenarios] of Object.entries(GUARDED)) {
    scenarios.forEach((scenario, i) => {
      it(`${route} #${i + 1}: refused for the glossary, nothing written`, async () => {
        const w = world();
        const before = snapshot(w.db);
        await scenario(w);
        expect(snapshot(w.db)).toEqual(before);
      });
    });
  }

  describe('requests that do not touch a glossary term work as before', () => {
    it('a request for a brand-new concept is accepted through every door', async () => {
      const w = world();
      const fresh = {
        type: GcProposalType.NEW,
        payload: { preferred_label: 'Brand new' },
        rationale: 'Missing term',
      };
      const asUser = await w.requestsCtl.submitAsUser(SCHEME, fresh, user);
      expect(asUser.state).toBe(GcProposalState.SUBMITTED);
      const asPlatform = await w.platformCtl.submit(
        SCHEME,
        { ...fresh, requester_email: 'p@cgiar.org' },
        platformAuth,
      );
      expect(asPlatform.state).toBe(GcProposalState.SUBMITTED);
      await expect(
        w.requestsCtl.start(SCHEME, { ...fresh, email: 'someone@cgiar.org' }),
      ).resolves.toEqual({ status: 'verification_sent', expires_in_hours: 24 });
    });

    it('an edit of a concept outside the glossary is accepted', async () => {
      const w = world();
      const r = await w.requestsCtl.submitAsUser(
        SCHEME,
        edit(w.ids.otherTerm),
        user,
      );
      expect(r.state).toBe(GcProposalState.SUBMITTED);
    });

    it('a request already stored about a glossary term can still be rejected', async () => {
      const w = world();
      const r = await w.adminCtl.transition(
        w.ids.proposalId,
        {
          action: GcRequestAction.REJECT,
          expected_state: GcProposalState.IN_REVIEW,
        },
        user,
      );
      expect(r.state).toBe(GcProposalState.REJECTED);
    });
  });

  describe('outside the glossary nothing changes', () => {
    it('a concept outside the glossary is still edited, merged and re-membered', async () => {
      const w = world();
      const edited = await w.adminCtl.update(
        SCHEME,
        w.ids.otherTerm,
        { definition: 'Edited.' },
        user,
      );
      expect(edited.definition).toBe('Edited.');
      const other = await w.adminCtl.setMembers(SCHEME, 'other', {
        term_ids: [501],
      });
      expect(other.members.map((m) => m.term_id)).toEqual([501]);
      await w.adminCtl.merge(SCHEME, 501, { into_term_id: 500 }, user);
      expect(
        w.db.rows(GcConcept).find((c) => Number(c.term_id) === 501)?.status,
      ).toBe(GcConceptStatus.DEPRECATED);
    });

    it('another collection that holds no glossary term can still be deleted', async () => {
      const w = world();
      await expect(
        w.adminCtl.deleteCollection(SCHEME, 'other'),
      ).resolves.toEqual({ deleted: 'other' });
    });
  });

  describe('the glossary writers are outside the lock', () => {
    const read = (rel: string) =>
      readFileSync(join(__dirname, '..', '..', rel), 'utf8');

    it('GlossaryStore and the glossary services never go through the taxonomy write services', () => {
      for (const file of [
        'glossary/glossary-store.ts',
        'glossary/glossary.service.ts',
        'glossary/glossary-admin.service.ts',
      ]) {
        const src = read(file);
        expect(src).not.toMatch(/glossary-write-lock/);
        expect(src).not.toMatch(
          /ConceptsAdminService|ConceptsCatalogService|ConceptsImportService|RequestsService|ConceptsIconsService/,
        );
      }
    });

    it('the migrations never import the lock (they write with SQL)', () => {
      const dir = join(__dirname, '..', '..', '..', '..', 'migrations');
      const offenders = readdirSync(dir).filter((f) =>
        /glossary-write-lock|services\/concepts-/.test(
          readFileSync(join(dir, f), 'utf8'),
        ),
      );
      expect(offenders).toEqual([]);
    });
  });
});
