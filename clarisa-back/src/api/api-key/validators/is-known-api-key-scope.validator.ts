import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isKnownApiKeyScope } from '../constants/api-key-scopes';

@ValidatorConstraint({ name: 'isKnownApiKeyScope', async: false })
export class IsKnownApiKeyScopeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    return typeof value === 'string' && isKnownApiKeyScope(value);
  }

  defaultMessage(): string {
    return 'required_scope must be a known scope (see GET /api/api-keys/scopes)';
  }
}

export function IsKnownApiKeyScope(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsKnownApiKeyScopeConstraint,
    });
  };
}
