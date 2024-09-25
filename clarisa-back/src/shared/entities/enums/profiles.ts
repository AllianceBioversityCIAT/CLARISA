export class Profile {
  public static readonly LOCAL = new Profile('LOCAL');
  public static readonly DEV = new Profile('DEV');
  public static readonly PROD = new Profile('PROD');

  private constructor(public readonly name: string) {}

  public static getfromName(name: string): Profile | undefined {
    return (Object.values(this) as Profile[]).find((p) => p.name === name);
  }

  public get isDev(): boolean {
    return this === Profile.DEV;
  }

  public get isProd(): boolean {
    return this === Profile.PROD;
  }

  public get isLocal(): boolean {
    return this === Profile.LOCAL;
  }

  public static isDev(name: string): boolean {
    return Profile.getfromName(name) === Profile.DEV;
  }

  public static isProd(name: string): boolean {
    return Profile.getfromName(name) === Profile.PROD;
  }

  public static isLocal(name: string): boolean {
    return Profile.getfromName(name) === Profile.LOCAL;
  }
}
