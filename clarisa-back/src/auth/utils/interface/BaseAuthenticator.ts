export interface BaseAuthenticator {
  authenticate(username: string, password: string): Promise<boolean>;
}
