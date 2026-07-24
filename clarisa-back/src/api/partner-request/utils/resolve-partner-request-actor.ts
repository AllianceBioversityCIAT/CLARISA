import { BadRequestException } from '@nestjs/common';
import { ApiKeyAuthContext } from '../../api-key/interfaces/api-key-auth-context';
import { UserData } from '../../../shared/interfaces/user-data';

/**
 * JWT callers: use panel user from the token.
 * API-key callers: audit fields still require a real users.id — take it from the request body.
 */
export function resolvePartnerRequestActor(
  userData: UserData | undefined,
  apiKeyAuth: ApiKeyAuthContext | undefined,
  bodyUser?: { userId?: number; email?: string },
): UserData {
  if (userData?.userId) {
    return userData;
  }

  if (apiKeyAuth) {
    if (!bodyUser?.userId || bodyUser.userId < 1) {
      throw new BadRequestException(
        'Body field userId is required when using X-API-Key authentication',
      );
    }

    return {
      userId: bodyUser.userId,
      email: bodyUser.email ?? '',
      permissions: '',
    };
  }

  throw new BadRequestException('Authenticated user context is missing');
}
