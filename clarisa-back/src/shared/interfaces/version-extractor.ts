export function versionExtractor(request: any) {
  console.log(!!request, request.query);
  if (!!request && !!request.query && !!request.query.version) {
    return String(request.query.version);
  }
  return '1';
}
