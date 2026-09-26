import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThan,
  LessThanOrEqual,
} from 'typeorm';
import { GcOutbox } from '../entities/gc-proposal.entity';
import { MessagingMicroservice } from '../../../integration/microservices/messaging/messaging.microservice';
import { GlobalConceptsConfig } from '../global-concepts.config';

export interface GcEmail {
  to: string;
  subject: string;
  html: string;
}

/** Give up after this many attempts; the row stays for inspection. */
const MAX_ATTEMPTS = 8;
/** A leased row is not picked again for this long, even if the sender dies. */
const LEASE_MS = 5 * 60_000;

/**
 * Transactional outbox (V30): an email is written in the same transaction as
 * the decision that causes it, and delivered afterwards. A crash between the
 * commit and the send cannot lose the outcome, and a messaging outage only
 * delays it — retries back off exponentially up to MAX_ATTEMPTS.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly messaging: MessagingMicroservice,
  ) {}

  /** Queues an email inside the caller's transaction. */
  async enqueueEmail(manager: EntityManager, email: GcEmail) {
    await manager.save(
      GcOutbox,
      manager.create(GcOutbox, {
        kind: 'email',
        payload: { ...email },
        attempts: 0,
      }),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deliverPending(limit = 20) {
    if (!GlobalConceptsConfig.enabled || this.running) return;
    this.running = true;
    try {
      const due = await this.dataSource.manager.find(GcOutbox, {
        // Exhausted rows are left out of the query, so they can never fill
        // the batch and starve newer emails.
        where: {
          delivered_at: IsNull(),
          attempts: LessThan(MAX_ATTEMPTS),
          next_attempt_at: LessThanOrEqual(new Date()),
        },
        order: { id: 'ASC' },
        take: limit,
      });
      for (const row of due) {
        // Lease the row first: with more than one API instance only the one
        // whose conditional update wins sends it, so no email goes out twice.
        const lease = await this.dataSource.manager.update(
          GcOutbox,
          { id: row.id, attempts: row.attempts, delivered_at: IsNull() },
          { next_attempt_at: new Date(Date.now() + LEASE_MS) },
        );
        if (!lease.affected) continue;
        try {
          const email = row.payload as unknown as GcEmail;
          await this.messaging.sendPlainEmail(
            email.to,
            email.subject,
            email.html,
          );
          row.delivered_at = new Date();
        } catch (err) {
          row.attempts += 1;
          row.next_attempt_at = new Date(
            Date.now() + 60_000 * 2 ** Math.min(row.attempts, 8),
          );
          this.logger.warn(
            `outbox ${row.id} attempt ${row.attempts} failed: ${(err as Error)?.message}`,
          );
        }
        await this.dataSource.manager.save(GcOutbox, row);
      }
    } finally {
      this.running = false;
    }
  }
}

/** Escapes text for the HTML emails built in code. */
export const escapeHtml = (text: string) =>
  String(text ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
