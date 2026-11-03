export class ValidateApiKeyMisDto {
  id: number;
  name: string;
  acronym: string;
}

export class ValidateApiKeyResponseDto {
  valid: boolean;
  mis?: ValidateApiKeyMisDto;
  environment?: string;
  scopes?: string[];
  /** Extra grants of the key; `[]` when it has none */
  allowed_endpoints?: string[];
  /**
   * True only when `endpoint_accessed` is in `allowed_endpoints`. CLARISA does
   * not reject on it: the calling service decides which of its routes need
   * the grant (Reporting: the QA write routes).
   */
  endpoint_allowed?: boolean;
  error?: string;
  /** Set on successful validation; omitted from public HTTP responses */
  api_key_id?: number;
  key_prefix?: string;
}
