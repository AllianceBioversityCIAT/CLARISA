export class Profile {
  public static readonly LOCAL = new Profile('LOCAL');
  public static readonly DEV = new Profile('DEV');
  public static readonly PROD = new Profile('PROD');

  private constructor(public readonly name: string) {}

  public static getfromName(name: string | undefined): Profile | undefined {
    return (Object.values(this) as Profile[]).find((p) => p.name === name);
  }
}
