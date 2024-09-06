import { Immutable } from '../utils/deep-immutable';

export function versionExtractor(
  request: Immutable<{ query?: { version?: number | string } }> | null,
): string {
  if (!!request && !!request.query && !!request.query.version) {
    return String(request.query.version);
  }
  return '1';
}
