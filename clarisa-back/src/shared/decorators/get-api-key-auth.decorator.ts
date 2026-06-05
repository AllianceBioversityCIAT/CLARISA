import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { API_KEY_AUTH_CONTEXT_KEY } from '../../api/api-key/constants/api-key-auth.constants';
import { ApiKeyAuthContext } from '../../api/api-key/interfaces/api-key-auth-context';

export const GetApiKeyAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyAuthContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request[API_KEY_AUTH_CONTEXT_KEY] as ApiKeyAuthContext | undefined;
  },
);
