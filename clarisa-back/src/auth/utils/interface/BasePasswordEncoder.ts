export interface BasePasswordEncoder {
  matches(hashedPassword: string, incomingPassword: string): boolean;
  encode(incomingPassword: string): string;
}
