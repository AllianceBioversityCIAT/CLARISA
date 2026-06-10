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
  error?: string;
  /** Set on successful validation; omitted from public HTTP responses */
  api_key_id?: number;
  key_prefix?: string;
}
