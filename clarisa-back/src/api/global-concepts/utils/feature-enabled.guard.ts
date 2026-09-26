import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalConceptsConfig } from '../global-concepts.config';

/** Answers 404 on every route of the module while it is switched off (D9). */
@Injectable()
export class GlobalConceptsEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!GlobalConceptsConfig.enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}

/** 404 on the AI routes while AI is off or has no key (spec: AI disabled). */
@Injectable()
export class GlobalConceptsAiEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!GlobalConceptsConfig.enabled || !GlobalConceptsConfig.aiEnabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
