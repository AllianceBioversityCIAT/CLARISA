//This is not really a class, but for some reason TS does not allow
//default methods on interfaces
export abstract class BasePasswordEncoder {
  public abstract matches(hashedPassword: string, incomingPassword): boolean;
  public abstract encode(incomingPassword): string;
}
