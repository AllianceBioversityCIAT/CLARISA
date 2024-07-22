export class SourceOption {
  public static readonly ALL = new SourceOption(0, 'all');
  public static readonly ONE_CGIAR = new SourceOption(1, 'one-cgiar');
  public static readonly LEGACY = new SourceOption(2, 'legacy');
  public static readonly AGRESSO = new SourceOption(3, 'agresso');
  public static readonly INNOVATION_CATALOG = new SourceOption(
    4,
    'innovation-catalog',
  );
  public static readonly IATI = new SourceOption(5, 'iati');

  private constructor(
    public readonly source_id: number,
    public readonly path: string,
  ) {}

  public static getfromPath(path: string): SourceOption | undefined {
    return (Object.values(this) as SourceOption[]).find((p) => p.path === path);
  }

  public static getfromSourceId(source_id: number): SourceOption | undefined {
    return (Object.values(this) as SourceOption[]).find(
      (p) => p.source_id === source_id,
    );
  }

  public static getAsEnumLikeObject(): { [key: string]: string } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as SourceOption[]).forEach((mo) => {
      const key = mo.path.toUpperCase().replace(/-/g, '_');
      enumeration[key] = mo.path;
    });

    return enumeration;
  }

  public static getOnyGeoscopeRelatedEnumLikeObject(): {
    [key: string]: string;
  } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as SourceOption[]).forEach((mo) => {
      if (mo === this.LEGACY || mo === this.ONE_CGIAR) {
        const key = mo.path.toUpperCase().replace(/-/g, '_');
        enumeration[key] = mo.path;
      }
    });

    return enumeration;
  }
}
