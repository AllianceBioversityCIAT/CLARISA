export class MisOption {
  public static readonly ALL = new MisOption(0, 'all');
  public static readonly CLARISA = new MisOption(1, 'clarisa');
  public static readonly OST = new MisOption(2, 'ost');
  public static readonly AICCRA = new MisOption(3, 'aiccra');
  public static readonly MEL = new MisOption(4, 'mel');
  public static readonly CGSPACE = new MisOption(5, 'cgspace');
  public static readonly FORESIGHT = new MisOption(6, 'foresight');
  public static readonly ECONTRACTS = new MisOption(7, 'econtracts');
  public static readonly TOC = new MisOption(8, 'toc');
  public static readonly PRMS = new MisOption(9, 'prms');
  public static readonly MARLO = new MisOption(10, 'marlo');
  public static readonly PIPELINE = new MisOption(11, 'pipeline');

  private constructor(
    public readonly mis_id: number,
    public readonly path: string,
  ) {}

  public static getfromPath(path: string): MisOption | undefined {
    return (Object.values(this) as MisOption[]).find((p) => p.path === path);
  }

  public static getfromSourceId(mis_id: number): MisOption | undefined {
    return (Object.values(this) as MisOption[]).find(
      (p) => p.mis_id === mis_id,
    );
  }

  public static getAsEnumLikeObject(): { [key: string]: string } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as MisOption[]).forEach((mo) => {
      enumeration[mo.path.toUpperCase()] = mo.path;
    });

    return enumeration;
  }
}
