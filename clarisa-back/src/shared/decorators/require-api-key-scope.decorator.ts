import { SetMetadata } from '@nestjs/common';

export const REQUIRE_API_KEY_SCOPE = 'requireApiKeyScope';

export const RequireApiKeyScope = (scope: string) =>
  SetMetadata(REQUIRE_API_KEY_SCOPE, scope);
