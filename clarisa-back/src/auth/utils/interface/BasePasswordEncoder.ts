//This is not really a class, but for some reason TS does not allow
//default methods on interfaces
export interface BasePasswordEncoder {
  matches(hashedPassword: string, incomingPassword: unknown): boolean;
  encode(incomingPassword: unknown): string;
}
