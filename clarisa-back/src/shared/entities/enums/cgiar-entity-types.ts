export class CgiarEntityTypeOption {
  public static readonly CRP = new CgiarEntityTypeOption(1, 'crps');
  public static readonly OLD_CENTER = new CgiarEntityTypeOption(
    2,
    'old-centers',
  );
  public static readonly PLATFORM = new CgiarEntityTypeOption(3, 'platforms');
  public static readonly CENTER = new CgiarEntityTypeOption(4, 'centers');
  public static readonly ALLIANCE = new CgiarEntityTypeOption(5, 'alliance');
  public static readonly INITIATIVES = new CgiarEntityTypeOption(
    6,
    'initiatives',
  );
  public static readonly APPLICATIONS = new CgiarEntityTypeOption(7, 'apps');
  public static readonly OFFICES = new CgiarEntityTypeOption(8, 'offices');
  public static readonly ONE_CGIAR_PLATFORM = new CgiarEntityTypeOption(
    9,
    'one-cgiar-platforms',
  );

  private constructor(
    public readonly entity_type_id: number,
    public readonly path: string,
  ) {}

  public static getfromPath(path: string): CgiarEntityTypeOption | undefined {
    return (Object.values(this) as CgiarEntityTypeOption[]).find(
      (p) => p.path === path,
    );
  }

  public static getfromSourceId(
    entity_type_id: number,
  ): CgiarEntityTypeOption | undefined {
    return (Object.values(this) as CgiarEntityTypeOption[]).find(
      (p) => p.entity_type_id === entity_type_id,
    );
  }
}
