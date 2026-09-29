import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { ConceptsAdminService } from './concepts-admin.service';
import { ConceptGraphLoader } from './concept-graph.loader';
import { OutboxService } from './outbox.service';
import { FakeManager, fakeDataSource } from '../utils/fake-manager.spec-helper';
import { GcScheme } from '../entities/gc-scheme.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcListValue } from '../entities/gc-list-value.entity';
import {
  GcEmailVerification,
  GcOutbox,
  GcProposal,
  GcProposalEvent,
  GcProposalOrigin,
  GcProposalState,
  GcProposalType,
} from '../entities/gc-proposal.entity';
import { GcMapping } from '../entities/gc-mapping.entity';
import { GcRequestAction } from '../dto/request.dto';
import { CreateGlobalConcepts1790500000000 } from '../../../../migrations/1790500000000-CreateGlobalConcepts';

const { toValue } = CreateGlobalConcepts1790500000000;

const admin = { email: 'admin@cgiar.org' };
const user = { origin: GcProposalOrigin.CLARISA_USER, email: 'user@cgiar.org' };

describe('RequestsService', () => {
  let db: FakeManager;
  let service: RequestsService;
  let meliaf: GcScheme;

  const concept = (
    term_id: number,
    label: string,
    status = GcConceptStatus.APPROVED,
    extra: Partial<GcConcept> = {},
  ) =>
    db.seed(GcConcept, {
      scheme_id: meliaf.id,
      term_id,
      preferred_label: label,
      language: 'en',
      status,
      version: '1.0',
      replaced_by_id: null,
      meliaf_function: [],
      meliaf_phase_also: [],
      validated_by: [],
      ai_generated_fields: [],
      extra: {},
      ...extra,
    });

  const transition = (
    id: number,
    action: GcRequestAction,
    expected: GcProposalState,
    decider = admin,
  ) => service.transition(id, { action, expected_state: expected }, decider);

  beforeEach(() => {
    db = new FakeManager();
    meliaf = db.seed(GcScheme, {
      code: 'meliaf',
      title: 'MELIAF',
      default_language: 'en',
      next_term_id: 1,
      uri_base: null,
      validator_required: false,
      owner_platform: null,
    });
    for (const [list, labels] of Object.entries(
      CreateGlobalConcepts1790500000000.LISTS,
    )) {
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
    }
    const ds = fakeDataSource(db);
    const adminService = new ConceptsAdminService(ds, new ConceptGraphLoader());
    service = new RequestsService(
      ds,
      adminService,
      new OutboxService(ds, {} as any),
    );
  });

  describe('submission', () => {
    it('records a request, its first event and a receipt email', async () => {
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.NEW,
          payload: { preferred_label: 'Resilience' },
          rationale: 'Missing term',
        },
        user,
      );
      expect(r.state).toBe(GcProposalState.SUBMITTED);
      expect(db.rows(GcProposalEvent)).toHaveLength(1);
      expect(db.rows(GcOutbox)).toHaveLength(1);
      expect((db.rows(GcOutbox)[0].payload as any).to).toBe('user@cgiar.org');
    });

    it('rejects a payload field an admin could not set', async () => {
      await expect(
        service.submit(
          'meliaf',
          {
            type: GcProposalType.NEW,
            payload: { preferred_label: 'X', created_by_email: 'x' },
            rationale: 'r',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('needs term_id for an edit and at least one field', async () => {
      concept(1, 'Outcome');
      await expect(
        service.submit(
          'meliaf',
          {
            type: GcProposalType.EDIT,
            payload: { definition: 'd' },
            rationale: 'r',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.submit(
          'meliaf',
          {
            type: GcProposalType.EDIT,
            term_id: 1,
            payload: {},
            rationale: 'r',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records the concept version an edit was written against', async () => {
      concept(1, 'Outcome', GcConceptStatus.APPROVED, { version: '1.3' });
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.EDIT,
          term_id: 1,
          payload: { definition: 'new' },
          rationale: 'r',
        },
        user,
      );
      expect(
        db.rows(GcProposal).find((p) => Number(p.id) === r.id)!.base_version,
      ).toBe('1.3');
    });
  });

  describe('platforms', () => {
    const prms = {
      origin: GcProposalOrigin.PLATFORM,
      email: 'someone@cgiar.org',
      platform: 'prms',
    };
    const body = {
      type: GcProposalType.NEW,
      payload: { preferred_label: 'Innovation' },
      rationale: 'r',
      requester_email: 'someone@cgiar.org',
      external_request_id: 'prms-42',
    };

    it('requires the person behind the key', async () => {
      await expect(
        service.submit('meliaf', { ...body, requester_email: undefined }, prms),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the same request on a retry and 409 when the id is reused with another payload (V15)', async () => {
      const first = await service.submit('meliaf', body, prms);
      const again = await service.submit('meliaf', body, prms);
      expect(again.id).toBe(first.id);
      expect(db.rows(GcProposal)).toHaveLength(1);
      await expect(
        service.submit(
          'meliaf',
          { ...body, payload: { preferred_label: 'Other' } },
          prms,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets a platform follow only its own requests', async () => {
      const r = await service.submit('meliaf', body, prms);
      await expect(
        service.getForRequester(r.id, { platform: 'prms' }),
      ).resolves.toBeDefined();
      await expect(
        service.getForRequester(r.id, { platform: 'hub' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not let a platform decide requests of a scheme it does not own', async () => {
      const r = await service.submit('meliaf', body, prms);
      await expect(
        transition(
          r.id,
          GcRequestAction.START_REVIEW,
          GcProposalState.SUBMITTED,
          { email: 'platform:prms', platform: 'prms' } as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('decisions', () => {
    it('approving a new-concept request creates it approved and links it', async () => {
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.NEW,
          payload: {
            preferred_label: 'Resilience',
            definition: 'The ability…',
          },
          rationale: 'r',
        },
        user,
      );
      await transition(
        r.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      const done = await transition(
        r.id,
        GcRequestAction.APPROVE,
        GcProposalState.IN_REVIEW,
      );
      expect(done.state).toBe(GcProposalState.APPROVED);
      const created = db
        .rows(GcConcept)
        .find((c) => c.preferred_label === 'Resilience')!;
      expect(created.status).toBe(GcConceptStatus.APPROVED);
      expect(Number(db.rows(GcProposal)[0].target_concept_id)).toBe(
        Number(created.id),
      );
      expect(
        db
          .rows(GcOutbox)
          .some((o) => /approved/.test((o.payload as any).subject)),
      ).toBe(true);
    });

    it('refuses a decision on a state that changed meanwhile (V27)', async () => {
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.NEW,
          payload: { preferred_label: 'X' },
          rationale: 'r',
        },
        user,
      );
      await transition(
        r.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      await expect(
        transition(
          r.id,
          GcRequestAction.START_REVIEW,
          GcProposalState.SUBMITTED,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('cannot approve straight from submitted', async () => {
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.NEW,
          payload: { preferred_label: 'X' },
          rationale: 'r',
        },
        user,
      );
      await expect(
        transition(r.id, GcRequestAction.APPROVE, GcProposalState.SUBMITTED),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sends a stale edit back to review, persisted, and answers 409 (V16)', async () => {
      const c = concept(1, 'Outcome', GcConceptStatus.APPROVED, {
        definition: 'v1',
      });
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.EDIT,
          term_id: 1,
          payload: { definition: 'proposed' },
          rationale: 'r',
        },
        user,
      );
      await transition(
        r.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      c.version = '1.1'; // an admin edited the concept meanwhile
      await expect(
        transition(r.id, GcRequestAction.APPROVE, GcProposalState.IN_REVIEW),
      ).rejects.toBeInstanceOf(ConflictException);
      const p = db.rows(GcProposal)[0];
      expect(p.state).toBe(GcProposalState.IN_REVIEW);
      expect(p.base_version).toBe('1.1');
      expect(c.definition).toBe('v1');
      await expect(
        transition(r.id, GcRequestAction.APPROVE, GcProposalState.IN_REVIEW),
      ).resolves.toBeDefined();
      expect(c.definition).toBe('proposed');
    });

    it('requires the validation step and waits for the no-objection window when the scheme has a validator', async () => {
      meliaf.validator_required = true;
      meliaf.no_objection_days = 5;
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.NEW,
          payload: { preferred_label: 'X' },
          rationale: 'r',
        },
        user,
      );
      await transition(
        r.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      await expect(
        transition(r.id, GcRequestAction.APPROVE, GcProposalState.IN_REVIEW),
      ).rejects.toBeInstanceOf(BadRequestException);
      await transition(
        r.id,
        GcRequestAction.SEND_TO_VALIDATION,
        GcProposalState.IN_REVIEW,
      );
      await expect(
        transition(r.id, GcRequestAction.APPROVE, GcProposalState.VALIDATION),
      ).rejects.toBeInstanceOf(BadRequestException);
      db.rows(GcProposal)[0].no_objection_until = new Date(Date.now() - 1000);
      const done = await transition(
        r.id,
        GcRequestAction.APPROVE,
        GcProposalState.VALIDATION,
      );
      expect(done.state).toBe(GcProposalState.APPROVED);
    });

    it('applies a deprecation with replacement', async () => {
      concept(1, 'Old');
      concept(2, 'New');
      const r = await service.submit(
        'meliaf',
        {
          type: GcProposalType.DEPRECATE,
          term_id: 1,
          payload: { replaced_by_term_id: 2 },
          rationale: 'Superseded',
        },
        user,
      );
      await transition(
        r.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      await transition(
        r.id,
        GcRequestAction.APPROVE,
        GcProposalState.IN_REVIEW,
      );
      expect(db.rows(GcConcept).find((c) => c.term_id === 1)!.status).toBe(
        GcConceptStatus.DEPRECATED,
      );
    });

    it('promotes a platform concept keeping its URI with an exact mapping (V13)', async () => {
      const prmsScheme = db.seed(GcScheme, {
        code: 'prms',
        title: 'PRMS',
        default_language: 'en',
        next_term_id: 1,
        uri_base: null,
        owner_platform: 'prms',
        validator_required: false,
      });
      db.seed(GcConcept, {
        scheme_id: prmsScheme.id,
        term_id: 5,
        preferred_label: 'Innovation package',
        language: 'en',
        status: GcConceptStatus.APPROVED,
        version: '1.0',
        replaced_by_id: null,
      });
      const r = await service.submit(
        'prms',
        {
          type: GcProposalType.PROMOTE,
          term_id: 5,
          target_scheme: 'meliaf',
          payload: {},
          rationale: 'Should be global',
        },
        user,
      );
      await transition(
        r.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      await transition(
        r.id,
        GcRequestAction.APPROVE,
        GcProposalState.IN_REVIEW,
      );
      const global = db
        .rows(GcConcept)
        .find(
          (c) =>
            Number(c.scheme_id) === Number(meliaf.id) &&
            c.preferred_label === 'Innovation package',
        )!;
      expect(global.status).toBe(GcConceptStatus.APPROVED);
      const source = db
        .rows(GcConcept)
        .find(
          (c) =>
            c.term_id === 5 && Number(c.scheme_id) === Number(prmsScheme.id),
        )!;
      expect(source.status).toBe(GcConceptStatus.APPROVED);
      expect(db.rows(GcMapping)[0]).toMatchObject({
        match_type: 'exact',
        target_scheme: 'meliaf',
      });
    });
  });

  describe('public form', () => {
    const body = {
      type: GcProposalType.NEW,
      payload: { preferred_label: 'Resilience' },
      rationale: 'r',
      email: 'person@cgiar.org',
    };

    it('stores a draft, emails a link, and creates the request only when the link is used once', async () => {
      await service.startPublic('meliaf', body);
      expect(db.rows(GcProposal)).toHaveLength(0);
      const mail = (db.rows(GcOutbox)[0].payload as any).html as string;
      const token = decodeURIComponent(/token=([^"&<]+)/.exec(mail)![1]);
      const created = await service.verifyPublic(token);
      expect(created.state).toBe(GcProposalState.SUBMITTED);
      expect(db.rows(GcProposal)[0].origin).toBe(GcProposalOrigin.FORM);
      expect(db.rows(GcProposal)[0].access_token_hash).not.toBe(
        created.access_token,
      ); // only the hash is stored
      await expect(service.verifyPublic(token)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      await expect(
        service.getForRequester(created.id, {
          accessToken: created.access_token,
        }),
      ).resolves.toBeDefined();
      await expect(
        service.getForRequester(created.id, { accessToken: 'wrong' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets the requester resubmit after changes are requested', async () => {
      await service.startPublic('meliaf', body);
      const token = decodeURIComponent(
        /token=([^"&<]+)/.exec((db.rows(GcOutbox)[0].payload as any).html)![1],
      );
      const created = await service.verifyPublic(token);
      await transition(
        created.id,
        GcRequestAction.START_REVIEW,
        GcProposalState.SUBMITTED,
      );
      await transition(
        created.id,
        GcRequestAction.REQUEST_CHANGES,
        GcProposalState.IN_REVIEW,
      );
      const back = await service.resubmit(
        created.id,
        { payload: { preferred_label: 'Resilience (system)' } },
        { accessToken: created.access_token, email: 'requester' },
      );
      expect(back.state).toBe(GcProposalState.IN_REVIEW);
      expect(db.rows(GcProposalEvent).at(-1)!.actor_email).toBe(
        'person@cgiar.org',
      );
    });

    it('rate-limits verification emails per address', async () => {
      for (let i = 0; i < 5; i++) {
        db.seed(GcEmailVerification, {
          email: 'person@cgiar.org',
          token_hash: `h${i}`,
          proposal_draft: {},
          expires_at: new Date(Date.now() + 1e6),
          created_at: new Date(),
        });
      }
      await expect(service.startPublic('meliaf', body)).rejects.toBeInstanceOf(
        HttpException,
      );
    });

    it('refuses an expired link', async () => {
      await service.startPublic('meliaf', body);
      const token = decodeURIComponent(
        /token=([^"&<]+)/.exec((db.rows(GcOutbox)[0].payload as any).html)![1],
      );
      db.rows(GcEmailVerification)[0].expires_at = new Date(Date.now() - 1000);
      await expect(service.verifyPublic(token)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
    it('files the request under the verified email, never one in the body', async () => {
      await service.startPublic('meliaf', {
        ...body,
        requester_email: 'victim@cgiar.org',
        external_request_id: 'x-1',
      });
      const draft = db.rows(GcEmailVerification)[0].proposal_draft as any;
      expect(draft.requester_email).toBeUndefined();
      expect(draft.external_request_id).toBeUndefined();
      const token = decodeURIComponent(
        /token=([^"&<]+)/.exec((db.rows(GcOutbox)[0].payload as any).html)![1],
      );
      await service.verifyPublic(token);
      expect(db.rows(GcProposal)[0].requester_email).toBe('person@cgiar.org');
      expect(db.rows(GcProposal)[0].external_request_id).toBeNull();
    });

    it('creates one request when the same link is confirmed twice at once', async () => {
      await service.startPublic('meliaf', body);
      const token = decodeURIComponent(
        /token=([^"&<]+)/.exec((db.rows(GcOutbox)[0].payload as any).html)![1],
      );
      const results = await Promise.allSettled([
        service.verifyPublic(token),
        service.verifyPublic(token),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(db.rows(GcProposal)).toHaveLength(1);
    });
  });

  describe('hardening', () => {
    it('ignores a requester email asserted by a signed-in user', async () => {
      await service.submit(
        'meliaf',
        {
          type: GcProposalType.NEW,
          payload: { preferred_label: 'Baseline' },
          rationale: 'r',
          requester_email: 'someone.else@cgiar.org',
        },
        user,
      );
      expect(db.rows(GcProposal)[0].requester_email).toBe('user@cgiar.org');
    });

    it('type-checks a deprecation payload at submit', async () => {
      concept(1, 'Output');
      await expect(
        service.submit(
          'meliaf',
          {
            type: GcProposalType.DEPRECATE,
            term_id: 1,
            payload: { replaced_by_term_id: 'two' },
            rationale: 'r',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('never lets exhausted outbox rows block newer emails', async () => {
      const sent: string[] = [];
      const outbox = new OutboxService(fakeDataSource(db), {
        sendPlainEmail: async (to: string) => {
          sent.push(to);
        },
      } as any);
      const past = new Date(Date.now() - 1000);
      db.seed(GcOutbox, {
        kind: 'email',
        payload: { to: 'dead@x.org', subject: 's', html: 'h' },
        attempts: 8,
        next_attempt_at: past,
        delivered_at: null,
      });
      db.seed(GcOutbox, {
        kind: 'email',
        payload: { to: 'fresh@x.org', subject: 's', html: 'h' },
        attempts: 0,
        next_attempt_at: past,
        delivered_at: null,
      });
      await outbox.deliverPending();
      expect(sent).toEqual(['fresh@x.org']);
      expect(db.rows(GcOutbox)[1].delivered_at).toBeInstanceOf(Date);
    });
  });
});
