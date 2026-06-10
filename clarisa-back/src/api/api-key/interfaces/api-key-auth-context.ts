export interface ApiKeyAuthContext {
  api_key_id: number;
  key_prefix: string;
  mis_id?: number;
  mis?: {
    id: number;
    name: string;
    acronym: string;
  };
  environment?: string;
  scopes?: string[];
}
