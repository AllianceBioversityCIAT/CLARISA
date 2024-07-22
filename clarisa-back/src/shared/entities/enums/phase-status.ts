export class PhaseStatus {
  public static readonly ALL = new PhaseStatus('All', 'all');
  public static readonly SHOW_ONLY_OPEN = new PhaseStatus('Open', 'open');
  public static readonly SHOW_ONLY_CLOSED = new PhaseStatus('Closed', 'closed');

  private constructor(
    public readonly name: string,
    public readonly path: string,
  ) {}

  public static getfromPath(path: string): PhaseStatus | undefined {
    return (Object.values(this) as PhaseStatus[]).find((p) => p.path === path);
  }

  public static getfromName(name: string): PhaseStatus | undefined {
    return (Object.values(this) as PhaseStatus[]).find((p) => p.name === name);
  }

  public static getAsEnumLikeObject(): { [key: string]: string } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as PhaseStatus[]).forEach((mo) => {
      enumeration[mo.path.toUpperCase()] = mo.path;
    });

    return enumeration;
  }
}
