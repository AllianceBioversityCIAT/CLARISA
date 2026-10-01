import { createParamDecorator } from '@nestjs/common';
import { DEFAULT_SCHEME_CODE } from '../global-concepts.config';

/**
 * The scheme a route works on. The API has one scheme and carries it in its
 * prefix (`/api/meliaf-taxonomy/…`, Yeck 2026-10-01), so no route has a
 * `:scheme` segment any more; handlers and services keep receiving the code.
 */
export const SchemeCode = createParamDecorator(
  (): string => DEFAULT_SCHEME_CODE,
);
