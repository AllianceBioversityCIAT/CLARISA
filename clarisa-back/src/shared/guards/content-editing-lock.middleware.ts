import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SettingsService } from '../../api/settings/settings.service';

/** What a caller reads when the lock refuses a write. */
export const CONTENT_EDITING_LOCKED_MESSAGE =
  'Editing of glossary terms and taxonomy concepts is paused by an administrator while adjustments are made. Try again later.';

/**
 * Writes that create or change a glossary term or a taxonomy concept. Reads,
 * previews (nothing is written), AI helpers and new change proposals (they
 * only queue a request) stay open; approving or applying a proposal does not.
 */
const LOCKED: RegExp[] = [
  /^\/api\/glossary\/update\/?$/,
  /^\/api\/glossary\/admin(\/|$)/,
  /^\/api\/meliaf-taxonomy\/admin(\/|$)/,
  /^\/api\/meliaf-taxonomy\/platform\/concepts(\/|$)/,
  /^\/api\/meliaf-taxonomy\/platform\/requests\/[^/]+\/transition\/?$/,
];
const STILL_OPEN: RegExp[] = [
  /^\/api\/glossary\/admin\/bulk\/preview\/?$/,
  /^\/api\/meliaf-taxonomy\/admin\/import\/preview\/?$/,
  /^\/api\/meliaf-taxonomy\/admin\/ai(\/|$)/,
  /^\/api\/meliaf-taxonomy\/admin\/concepts-assist(\/|$)/,
];

/** Whether a request is a write the editing lock holds back. */
export function isLockedWrite(method: string, url: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase()))
    return false;
  const path = String(url ?? '')
    .split('?')[0]
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
  return (
    LOCKED.some((re) => re.test(path)) &&
    !STILL_OPEN.some((re) => re.test(path))
  );
}

/**
 * The one place that enforces the editing lock (Parameters page, parameter
 * `content_editing_locked`): every write to the glossary or the taxonomy
 * passes here before any guard or controller, whatever screen, script or
 * system sent it. Locked → 423 with a message the panel shows as is.
 */
@Injectable()
export class ContentEditingLockMiddleware implements NestMiddleware {
  constructor(private readonly settings: SettingsService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if (
      isLockedWrite(req.method, req.originalUrl ?? req.url) &&
      (await this.settings.isContentEditingLocked())
    ) {
      throw new HttpException(
        CONTENT_EDITING_LOCKED_MESSAGE,
        HttpStatus.LOCKED,
      );
    }
    next();
  }
}
