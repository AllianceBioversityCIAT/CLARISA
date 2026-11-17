import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ControlListsConfig } from './control-lists.config';

/** 404 on every control lists route while `CONTROL_LISTS_ENABLED` is not `true`. */
@Injectable()
export class ControlListsEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!ControlListsConfig.enabled) throw new NotFoundException();
    return true;
  }
}
