import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DataSource, EntityManager, In, IsNull, MoreThan } from 'typeorm';
import {
  GcEmailVerification,
  GcProposal,
  GcProposalEvent,
  GcProposalOrigin,
  GcProposalState,
  GcProposalType,
} from '../entities/gc-proposal.entity';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcHistoryAction } from '../entities/gc-history.entity';
import { GcLabel } from '../entities/gc-label.entity';
import {
  GcMapping,
  GcMappingJustification,
  GcMappingStatus,
  GcMatchType,
} from '../entities/gc-mapping.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import {
  ConceptStatusDto,
  CreateConceptDto,
  UpdateConceptDto,
} from '../dto/concept-admin.dto';
import {
  GcRequestAction,
  RequestTransitionDto,
  ResubmitRequestDto,
  StartPublicRequestDto,
  SubmitRequestDto,
} from '../dto/request.dto';
import { conceptUri, GlobalConceptsConfig } from '../global-concepts.config';
import { ConceptsAdminService } from './concepts-admin.service';
import { likePattern } from './concepts-read.service';
import { escapeHtml, OutboxService } from './outbox.service';

/** Who submits: the three doors of Audit correction 2. */
export interface GcRequester {
  origin: GcProposalOrigin;
  email: string;
  platform?: string | null;
}

/** Who decides: a MELIAF admin, or a platform acting on a scheme it owns. */
export interface GcDecider {
  email: string;
  platform?: string | null;
}

const OPEN_STATES = [
  GcProposalState.SUBMITTED,
  GcProposalState.IN_REVIEW,
  GcProposalState.CHANGES_REQUESTED,
  GcProposalState.VALIDATION,
];

/** Public form: max verification emails per address per hour (V17). */
const MAX_STARTS_PER_HOUR = 5;
const VERIFICATION_TTL_MS = 24 * 3600 * 1000;
const DEFAULT_NO_OBJECTION_DAYS = 5;

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

/**
 * Concept requests — the Partner Requests pattern: people and platforms ask,
 * admins decide. State machine (design, Audit correction 5):
 *
 *   submitted → in_review ⇄ changes_requested
 *   in_review → validation (when the scheme has a validator) → approved | rejected
 *   in_review → approved | rejected (no validator)
 *
 * Every decision is a conditional UPDATE on the state the decider saw (V27),
 * approving applies the payload through the admin service in the same
 * transaction, and every step appends a proposal event and queues its email.
 */
@Injectable()
export class RequestsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: ConceptsAdminService,
    private readonly outbox: OutboxService,
  ) {}

  // ------------------------------------------------------------- submission

  async submit(code: string, dto: SubmitRequestDto, who: GcRequester) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      return this.submitIn(manager, scheme, dto, who);
    });
  }

  private async submitIn(
    manager: EntityManager,
    scheme: GcScheme,
    dto: SubmitRequestDto,
    who: GcRequester,
    accessTokenHash: string | null = null,
  ) {
    if (who.origin === GcProposalOrigin.PLATFORM) {
      if (!dto.requester_email) {
        throw new BadRequestException(
          'requester_email is required when a platform submits',
        );
      }
      if (dto.external_request_id) {
        const existing = await manager.findOne(GcProposal, {
          where: {
            origin_platform: who.platform,
            external_request_id: dto.external_request_id,
          },
        });
        if (existing) {
          if (
            JSON.stringify(existing.payload ?? {}) !==
              JSON.stringify(dto.payload ?? {}) ||
            existing.type !== dto.type
          ) {
            throw new ConflictException(
              `external_request_id "${dto.external_request_id}" was already used with a different request`,
            );
          }
          return this.present(existing);
        }
      }
    }
    const refs = await this.resolveRefs(manager, scheme, dto);
    const payload = this.validatePayload(dto.type, dto.payload ?? {});
    const proposal = manager.create(GcProposal, {
      type: dto.type,
      scheme_id: scheme.id,
      concept_id: refs.concept?.id ?? null,
      target_concept_id: refs.target?.id ?? null,
      target_scheme_id: refs.targetScheme?.id ?? null,
      base_version:
        dto.type === GcProposalType.EDIT
          ? (refs.concept?.version ?? null)
          : null,
      payload,
      rationale: dto.rationale.trim(),
      // Only a platform asserts the person behind it (V38); the form and a
      // signed-in user are always the verified identity, never the body.
      requester_email: (who.origin === GcProposalOrigin.PLATFORM
        ? (dto.requester_email as string)
        : who.email
      ).toLowerCase(),
      origin: who.origin,
      origin_platform: who.platform ?? null,
      external_request_id:
        who.origin === GcProposalOrigin.PLATFORM
          ? (dto.external_request_id ?? null)
          : null,
      access_token_hash: accessTokenHash,
      state: GcProposalState.SUBMITTED,
    });
    const saved = await manager.save(GcProposal, proposal);
    await this.event(
      manager,
      saved,
      null,
      GcProposalState.SUBMITTED,
      who.email,
      null,
    );
    await this.outbox.enqueueEmail(manager, {
      to: saved.requester_email,
      subject: `[CLARISA Global Concepts] Request #${saved.id} received`,
      html: this.emailBody(
        saved,
        scheme,
        'We received your request. You will be notified when it is decided.',
      ),
    });
    const duplicates = await this.possibleDuplicates(
      manager,
      scheme,
      payload,
      refs.concept?.id,
    );
    return { ...this.present(saved), possible_duplicates: duplicates };
  }

  /** Public form, step 1: keeps the request as a draft and emails a one-time link (V17). */
  async startPublic(code: string, dto: StartPublicRequestDto) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const email = dto.email.toLowerCase();
      const recent = await manager.count(GcEmailVerification, {
        where: {
          email,
          created_at: MoreThan(new Date(Date.now() - 3600 * 1000)),
        },
      });
      if (recent >= MAX_STARTS_PER_HOUR) {
        throw new HttpException(
          'Too many requests from this email; try again later',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Validate now, so a bad request fails before the email is sent.
      await this.resolveRefs(manager, scheme, dto);
      this.validatePayload(dto.type, dto.payload ?? {});
      const token = newToken();
      const {
        email: _omit,
        requester_email: _asserted,
        external_request_id: _external,
        ...draft
      } = dto;
      await manager.save(
        GcEmailVerification,
        manager.create(GcEmailVerification, {
          email,
          token_hash: sha256(token),
          proposal_draft: { scheme: scheme.code, ...draft },
          expires_at: new Date(Date.now() + VERIFICATION_TTL_MS),
        }),
      );
      const link = `${GlobalConceptsConfig.webBase}/requests/verify?token=${encodeURIComponent(token)}`;
      await this.outbox.enqueueEmail(manager, {
        to: email,
        subject: '[CLARISA Global Concepts] Confirm your concept request',
        html: `<p>Please confirm your request to <b>${escapeHtml(scheme.title)}</b> by opening this link within 24 hours:</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email.</p>`,
      });
      return { status: 'verification_sent', expires_in_hours: 24 };
    });
  }

  /** Public form, step 2: the link turns the draft into a request and returns its follow-up token (V29). */
  async verifyPublic(token: string) {
    return this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(GcEmailVerification, {
        where: { token_hash: sha256(token) },
      });
      if (!row || row.used_at || row.expires_at.getTime() < Date.now()) {
        throw new BadRequestException('This link is invalid or has expired');
      }
      // Conditional claim: two parallel clicks create one request, not two.
      const claimed = await manager.update(
        GcEmailVerification,
        { id: row.id, used_at: IsNull() },
        { used_at: new Date() },
      );
      if (!claimed.affected) {
        throw new BadRequestException('This link is invalid or has expired');
      }
      const { scheme: code, ...dto } =
        row.proposal_draft as unknown as SubmitRequestDto & { scheme: string };
      const scheme = await this.admin.lockScheme(manager, code);
      const access = newToken();
      const result = await this.submitIn(
        manager,
        scheme,
        dto,
        { origin: GcProposalOrigin.FORM, email: row.email },
        sha256(access),
      );
      await this.outbox.enqueueEmail(manager, {
        to: row.email,
        subject: `[CLARISA Global Concepts] Follow request #${result.id}`,
        html: `<p>Your request #${result.id} is registered. Follow it, or update it if changes are requested, here:</p><p>${escapeHtml(this.followLink(result.id, access))}</p>`,
      });
      return { ...result, access_token: access };
    });
  }

  // ------------------------------------------------------------------ reads

  async list(code: string, state?: string) {
    const manager = this.dataSource.manager;
    const scheme = await manager.findOne(GcScheme, {
      where: { code: (code ?? '').toLowerCase() },
    });
    if (!scheme)
      throw new NotFoundException(`Concept scheme "${code}" was not found`);
    const rows = await manager.find(GcProposal, {
      where: {
        scheme_id: scheme.id,
        ...(state ? { state: state as GcProposalState } : {}),
      },
      order: { id: 'DESC' },
    });
    return rows.map((r) => this.present(r, true));
  }

  async getForAdmin(id: number) {
    const proposal = await this.find(this.dataSource.manager, id);
    const events = await this.dataSource.manager.find(GcProposalEvent, {
      where: { proposal_id: proposal.id },
      order: { id: 'ASC' },
    });
    return { ...this.present(proposal, true), events };
  }

  /** What a public requester or a platform may see of its own request. */
  async getForRequester(
    id: number,
    auth: { accessToken?: string; platform?: string | null },
  ) {
    const proposal = await this.find(this.dataSource.manager, id);
    this.assertRequester(proposal, auth);
    return this.present(proposal);
  }

  // ---------------------------------------------------------------- changes

  /** The requester answers `changes_requested` and the request goes back to review. */
  async resubmit(
    id: number,
    dto: ResubmitRequestDto,
    auth: { accessToken?: string; platform?: string | null; email: string },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const proposal = await this.find(manager, id);
      this.assertRequester(proposal, auth);
      if (proposal.state !== GcProposalState.CHANGES_REQUESTED) {
        throw new ConflictException(
          'Only a request with changes requested can be resubmitted',
        );
      }
      const payload = dto.payload
        ? this.validatePayload(proposal.type, dto.payload)
        : proposal.payload;
      const res = await manager.update(
        GcProposal,
        { id: proposal.id, state: GcProposalState.CHANGES_REQUESTED },
        {
          state: GcProposalState.IN_REVIEW,
          payload: payload as any,
          rationale: dto.rationale?.trim() || proposal.rationale,
        },
      );
      if (!res.affected)
        throw new ConflictException('The request changed meanwhile; reload it');
      await this.event(
        manager,
        proposal,
        GcProposalState.CHANGES_REQUESTED,
        GcProposalState.IN_REVIEW,
        auth.platform ? auth.email : proposal.requester_email,
        'Resubmitted by the requester',
      );
      return this.present(await this.find(manager, id));
    });
  }

  /** An admin (or the owning platform) moves a request one step (V26, V27). */
  async transition(id: number, dto: RequestTransitionDto, decider: GcDecider) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const proposal = await this.find(manager, id);
      const scheme = await this.lockSchemes(manager, proposal);
      this.assertDecider(proposal, scheme, decider);
      if (proposal.state !== dto.expected_state) {
        throw new ConflictException(
          `The request is ${proposal.state}, not ${dto.expected_state}; reload it`,
        );
      }
      const to = this.nextState(proposal, scheme, dto.action);

      // V16: an edit written against an older version goes back to review.
      // It must be committed, so it returns a marker instead of throwing
      // (a throw would roll the state change back); the 409 is raised after.
      if (
        to === GcProposalState.APPROVED &&
        proposal.type === GcProposalType.EDIT &&
        proposal.base_version
      ) {
        const concept = proposal.concept_id
          ? await manager.findOne(GcConcept, {
              where: { id: proposal.concept_id },
            })
          : null;
        if (concept && concept.version !== proposal.base_version) {
          const res = await manager.update(
            GcProposal,
            { id: proposal.id, state: dto.expected_state },
            { state: GcProposalState.IN_REVIEW, base_version: concept.version },
          );
          if (!res.affected)
            throw new ConflictException(
              'The request was decided by someone else meanwhile',
            );
          const note = `Concept changed since the request was written (version ${proposal.base_version} → ${concept.version}); review it again`;
          await this.event(
            manager,
            proposal,
            dto.expected_state,
            GcProposalState.IN_REVIEW,
            decider.email,
            note,
          );
          return { stale: note };
        }
      }
      const patch: Partial<GcProposal> = {
        state: to,
        decided_by_email: decider.email,
      };
      if (dto.note) patch.decision_note = dto.note.trim();
      if (to === GcProposalState.VALIDATION) {
        patch.no_objection_until = new Date(
          Date.now() +
            (scheme.no_objection_days ?? DEFAULT_NO_OBJECTION_DAYS) *
              86_400_000,
        );
      }
      const res = await manager.update(
        GcProposal,
        { id: proposal.id, state: dto.expected_state },
        patch as any,
      );
      if (!res.affected)
        throw new ConflictException(
          'The request was decided by someone else meanwhile',
        );
      Object.assign(proposal, patch);

      if (to === GcProposalState.APPROVED) {
        await this.apply(manager, scheme, proposal, decider);
      }
      await this.event(
        manager,
        proposal,
        dto.expected_state,
        to,
        decider.email,
        dto.note ?? null,
      );
      if (
        [
          GcProposalState.APPROVED,
          GcProposalState.REJECTED,
          GcProposalState.CHANGES_REQUESTED,
        ].includes(to)
      ) {
        const verb = {
          approved: 'approved',
          rejected: 'rejected',
          changes_requested: 'returned for changes',
        }[to as string];
        await this.outbox.enqueueEmail(manager, {
          to: proposal.requester_email,
          subject: `[CLARISA Global Concepts] Request #${proposal.id} ${verb}`,
          html: this.emailBody(
            proposal,
            scheme,
            `Your request was ${verb}.${dto.note ? ` Note: ${dto.note}` : ''}`,
          ),
        });
      }
      return { result: this.present(await this.find(manager, id), true) };
    });
    if ('stale' in outcome) throw new ConflictException(outcome.stale);
    return outcome.result;
  }

  // ---------------------------------------------------------------- helpers

  private nextState(
    p: GcProposal,
    scheme: GcScheme,
    action: GcRequestAction,
  ): GcProposalState {
    const s = p.state;
    const validator = !!scheme.validator_required;
    switch (action) {
      case GcRequestAction.START_REVIEW:
        if (s === GcProposalState.SUBMITTED) return GcProposalState.IN_REVIEW;
        break;
      case GcRequestAction.REQUEST_CHANGES:
        if (s === GcProposalState.IN_REVIEW || s === GcProposalState.VALIDATION)
          return GcProposalState.CHANGES_REQUESTED;
        break;
      case GcRequestAction.SEND_TO_VALIDATION:
        if (s === GcProposalState.IN_REVIEW && validator)
          return GcProposalState.VALIDATION;
        if (!validator)
          throw new BadRequestException('This scheme has no validation step');
        break;
      case GcRequestAction.APPROVE:
        if (validator) {
          if (s !== GcProposalState.VALIDATION) {
            throw new BadRequestException(
              'This scheme requires the validation step before approval',
            );
          }
          if (
            p.no_objection_until &&
            p.no_objection_until.getTime() > Date.now()
          ) {
            throw new BadRequestException(
              `The no-objection window is open until ${p.no_objection_until.toISOString()}`,
            );
          }
          return GcProposalState.APPROVED;
        }
        if (s === GcProposalState.IN_REVIEW) return GcProposalState.APPROVED;
        break;
      case GcRequestAction.REJECT:
        if (OPEN_STATES.includes(s)) return GcProposalState.REJECTED;
        break;
    }
    throw new BadRequestException(`Cannot ${action} a request that is ${s}`);
  }

  /** Applies an approved request in the decision's transaction. */
  private async apply(
    manager: EntityManager,
    scheme: GcScheme,
    p: GcProposal,
    decider: GcDecider,
  ) {
    const txId = randomUUID();
    const actor = {
      email: decider.email,
      action: GcHistoryAction.REQUEST_APPLIED,
      proposalId: Number(p.id),
    };
    const payload = p.payload ?? {};
    const concept = p.concept_id
      ? await manager.findOne(GcConcept, { where: { id: p.concept_id } })
      : null;
    switch (p.type) {
      case GcProposalType.NEW: {
        const created = await this.admin.createIn(
          manager,
          scheme,
          {
            ...(payload as unknown as CreateConceptDto),
            status: GcConceptStatus.APPROVED,
          },
          actor,
          txId,
        );
        const row = await manager.findOne(GcConcept, {
          where: { scheme_id: scheme.id, term_id: created.term_id },
        });
        await manager.update(
          GcProposal,
          { id: p.id },
          { target_concept_id: row?.id ?? null },
        );
        return;
      }
      case GcProposalType.EDIT: {
        if (!concept)
          throw new NotFoundException(
            'The concept of this request no longer exists',
          );
        await this.admin.updateIn(
          manager,
          scheme,
          concept,
          payload as unknown as UpdateConceptDto,
          actor,
          txId,
        );
        return;
      }
      case GcProposalType.DEPRECATE: {
        if (!concept)
          throw new NotFoundException(
            'The concept of this request no longer exists',
          );
        const dto: ConceptStatusDto = {
          status: GcConceptStatus.DEPRECATED,
          replaced_by_term_id: payload.replaced_by_term_id as
            | number
            | undefined,
          reason: (payload.reason as string) ?? p.rationale ?? undefined,
        };
        await this.admin.setStatusIn(
          manager,
          scheme,
          concept,
          dto,
          actor,
          txId,
        );
        return;
      }
      case GcProposalType.MERGE: {
        const target = p.target_concept_id
          ? await manager.findOne(GcConcept, {
              where: { id: p.target_concept_id },
            })
          : null;
        if (!concept || !target)
          throw new NotFoundException(
            'A concept of this merge no longer exists',
          );
        await this.admin.mergeIn(manager, scheme, concept, target, actor, txId);
        return;
      }
      case GcProposalType.PROMOTE: {
        if (!concept)
          throw new NotFoundException(
            'The concept of this request no longer exists',
          );
        const target = await manager.findOne(GcScheme, {
          where: { id: p.target_scheme_id },
        });
        if (!target)
          throw new NotFoundException('The target scheme no longer exists');
        const labels = await manager.find(GcLabel, {
          where: { concept_id: concept.id },
        });
        const base: CreateConceptDto = {
          preferred_label: concept.preferred_label,
          definition: concept.definition ?? undefined,
          scope_note: concept.scope_note ?? undefined,
          example_of_use: concept.example_of_use ?? undefined,
          source_citation: concept.source_citation ?? undefined,
          source_url: concept.source_url ?? undefined,
          status: GcConceptStatus.APPROVED,
          ...(payload as unknown as CreateConceptDto),
        };
        const locked = await this.admin.lockScheme(manager, target.code);
        const created = await this.admin.createIn(
          manager,
          locked,
          base,
          actor,
          txId,
        );
        const newRow = await manager.findOne(GcConcept, {
          where: { scheme_id: target.id, term_id: created.term_id },
        });
        if (labels.length && newRow) {
          await this.admin.setLabelsIn(
            manager,
            locked,
            newRow,
            labels.map((l) => ({
              label: l.label,
              language: l.language,
              kind: l.kind,
              status: l.status,
            })),
            actor,
            txId,
          );
        }
        // V13: the platform concept keeps its URI and points to the global one.
        await manager.save(
          GcMapping,
          manager.create(GcMapping, {
            concept_id: concept.id,
            target_scheme: target.code,
            target_uri: conceptUri(target, created.term_id),
            target_label: created.preferred_label,
            match_type: GcMatchType.EXACT,
            justification: GcMappingJustification.MANUAL,
            author_email: decider.email,
            reviewed_by_email: decider.email,
            status: GcMappingStatus.APPROVED,
          }),
        );
        await manager.update(
          GcProposal,
          { id: p.id },
          { target_concept_id: newRow?.id ?? null },
        );
        if (payload.deprecate_source === true && newRow) {
          // Cross-scheme replacement is recorded as the mapping above; the source is retired with a reason.
          await this.admin.setStatusIn(
            manager,
            scheme,
            concept,
            {
              status: GcConceptStatus.DEPRECATED,
              reason: `Promoted to ${target.code}/${created.term_id}`,
            },
            actor,
            txId,
          );
        }
        return;
      }
    }
  }

  private async resolveRefs(
    manager: EntityManager,
    scheme: GcScheme,
    dto: SubmitRequestDto,
  ) {
    const needConcept = [
      GcProposalType.EDIT,
      GcProposalType.DEPRECATE,
      GcProposalType.MERGE,
      GcProposalType.PROMOTE,
    ];
    let concept: GcConcept | null = null;
    let target: GcConcept | null = null;
    let targetScheme: GcScheme | null = null;
    if (needConcept.includes(dto.type)) {
      if (!dto.term_id)
        throw new BadRequestException(`A ${dto.type} request needs term_id`);
      concept = await this.admin.findConcept(manager, scheme, dto.term_id);
      if (
        concept.status === GcConceptStatus.DEPRECATED &&
        dto.type !== GcProposalType.PROMOTE
      ) {
        throw new BadRequestException('That concept is already deprecated');
      }
    }
    if (dto.type === GcProposalType.MERGE) {
      if (!dto.target_term_id)
        throw new BadRequestException('A merge request needs target_term_id');
      target = await this.admin.findConcept(
        manager,
        scheme,
        dto.target_term_id,
      );
      if (Number(target.id) === Number(concept!.id))
        throw new BadRequestException('A concept cannot be merged into itself');
    }
    if (dto.type === GcProposalType.PROMOTE) {
      if (!dto.target_scheme)
        throw new BadRequestException('A promote request needs target_scheme');
      targetScheme = await manager.findOne(GcScheme, {
        where: { code: dto.target_scheme.toLowerCase() },
      });
      if (!targetScheme)
        throw new NotFoundException(
          `Concept scheme "${dto.target_scheme}" was not found`,
        );
      if (Number(targetScheme.id) === Number(scheme.id))
        throw new BadRequestException('Promote to a different scheme');
    }
    return { concept, target, targetScheme };
  }

  /** The payload must be what an admin could send for that action — nothing more. */
  private validatePayload(
    type: GcProposalType,
    payload: Record<string, unknown>,
  ) {
    let cls: any = null;
    if (type === GcProposalType.NEW) cls = CreateConceptDto;
    if (type === GcProposalType.EDIT || type === GcProposalType.PROMOTE)
      cls = UpdateConceptDto;
    if (type === GcProposalType.MERGE) {
      if (Object.keys(payload).length)
        throw new BadRequestException('A merge request carries no payload');
      return {};
    }
    if (type === GcProposalType.DEPRECATE) {
      const allowed = ['replaced_by_term_id', 'reason'];
      const extra = Object.keys(payload).filter((k) => !allowed.includes(k));
      if (extra.length)
        throw new BadRequestException(
          `Unexpected field(s): ${extra.join(', ')}`,
        );
      const { replaced_by_term_id: to, reason } = payload;
      if (
        to !== undefined &&
        to !== null &&
        !(Number.isInteger(to) && (to as number) > 0)
      )
        throw new BadRequestException(
          'replaced_by_term_id must be a positive integer',
        );
      if (
        reason !== undefined &&
        reason !== null &&
        (typeof reason !== 'string' || reason.length > 2000)
      )
        throw new BadRequestException(
          'reason must be text of up to 2000 characters',
        );
      return payload;
    }
    const { deprecate_source, status: _ignored, ...fields } = payload;
    const instance = plainToInstance(cls, fields);
    const errors = validateSync(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      throw new BadRequestException(
        errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; '),
      );
    }
    if (type === GcProposalType.EDIT && !Object.keys(fields).length) {
      throw new BadRequestException(
        'An edit request needs at least one field to change',
      );
    }
    return type === GcProposalType.PROMOTE && deprecate_source === true
      ? { ...fields, deprecate_source }
      : fields;
  }

  private async possibleDuplicates(
    manager: EntityManager,
    scheme: GcScheme,
    payload: Record<string, unknown>,
    exceptId?: number,
  ) {
    const label =
      typeof payload.preferred_label === 'string'
        ? payload.preferred_label.trim()
        : '';
    if (!label) return [];
    const rows = await manager
      .createQueryBuilder(GcConcept, 'c')
      .where('c.scheme_id = :s', { s: scheme.id })
      .andWhere('c.preferred_label LIKE :p', { p: likePattern(label) })
      .andWhere(exceptId ? 'c.id <> :id' : '1=1', { id: exceptId })
      .limit(5)
      .getMany()
      .catch(() => [] as GcConcept[]);
    return rows.map((c) => ({
      term_id: Number(c.term_id),
      preferred_label: c.preferred_label,
      status: c.status,
    }));
  }

  /**
   * Locks the scheme of the request (and the target of a promote) before any
   * check or write, like every direct admin write does: term ids, label
   * clashes and replacement chains are only safe under that lock. Always in
   * id order, so two promotes in opposite directions cannot deadlock.
   */
  private async lockSchemes(manager: EntityManager, p: GcProposal) {
    const ids = [p.scheme_id, p.target_scheme_id]
      .filter((v): v is number => v !== null && v !== undefined)
      .map(Number);
    const schemes = await manager.find(GcScheme, {
      where: { id: In([...new Set(ids)]) },
    });
    let own: GcScheme | null = null;
    for (const s of [...schemes].sort((a, b) => Number(a.id) - Number(b.id))) {
      const locked = await this.admin.lockScheme(manager, s.code);
      if (Number(s.id) === Number(p.scheme_id)) own = locked;
    }
    return own;
  }

  private assertDecider(p: GcProposal, scheme: GcScheme | null, d: GcDecider) {
    if (!scheme)
      throw new NotFoundException(
        'The scheme of this request no longer exists',
      );
    if (d.platform && scheme.owner_platform !== d.platform) {
      throw new ForbiddenException(
        'A platform can only decide requests of the scheme it owns',
      );
    }
    if (p.type === GcProposalType.PROMOTE && d.platform) {
      throw new ForbiddenException(
        'Promotions into another scheme are decided by its admins',
      );
    }
  }

  private assertRequester(
    p: GcProposal,
    auth: { accessToken?: string; platform?: string | null },
  ) {
    if (auth.platform) {
      if (p.origin_platform !== auth.platform)
        throw new NotFoundException('Request not found');
      return;
    }
    if (
      !auth.accessToken ||
      !p.access_token_hash ||
      sha256(auth.accessToken) !== p.access_token_hash
    ) {
      throw new NotFoundException('Request not found');
    }
  }

  private async find(manager: EntityManager, id: number) {
    const p = await manager.findOne(GcProposal, { where: { id } });
    if (!p) throw new NotFoundException('Request not found');
    return p;
  }

  private async event(
    manager: EntityManager,
    p: GcProposal,
    from: GcProposalState | null,
    to: GcProposalState,
    actor: string,
    note: string | null,
  ) {
    await manager.save(
      GcProposalEvent,
      manager.create(GcProposalEvent, {
        proposal_id: p.id,
        from_state: from,
        to_state: to,
        actor_email: actor,
        note,
      }),
    );
  }

  private followLink(id: number, token: string) {
    return `${GlobalConceptsConfig.webBase}/requests/${id}?token=${encodeURIComponent(token)}`;
  }

  private emailBody(p: GcProposal, scheme: GcScheme, message: string) {
    return `<p>${escapeHtml(message)}</p><p>Request #${p.id} · ${escapeHtml(p.type)} · ${escapeHtml(scheme.title)}</p><p>${escapeHtml(p.rationale ?? '')}</p>`;
  }

  /** Public shape; `admin` adds the internal fields the panel needs. */
  present(p: GcProposal, admin = false) {
    const base = {
      id: Number(p.id),
      type: p.type,
      state: p.state,
      payload: p.payload,
      rationale: p.rationale,
      decision_note: p.decision_note,
      no_objection_until: p.no_objection_until,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
    if (!admin) return base;
    return {
      ...base,
      concept_id: p.concept_id,
      target_concept_id: p.target_concept_id,
      target_scheme_id: p.target_scheme_id,
      base_version: p.base_version,
      requester_email: p.requester_email,
      origin: p.origin,
      origin_platform: p.origin_platform,
      requester_asserted_by_platform: p.origin === GcProposalOrigin.PLATFORM,
      external_request_id: p.external_request_id,
      ai_recommendation: p.ai_recommendation,
      decided_by_email: p.decided_by_email,
    };
  }
}
