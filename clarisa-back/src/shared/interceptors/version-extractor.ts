export function versionExtractor(request: any) {
  if (!!request && !!request.query && !!request.query.version) {
    return String(request.query.version);
  }
  return '1';
}
