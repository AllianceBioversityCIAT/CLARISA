export class CgiarEntityTypeOption {
  public static readonly CRP = new CgiarEntityTypeOption(1, 'crps');
  public static readonly PLATFORM = new CgiarEntityTypeOption(3, 'platforms');
  public static readonly CENTER = new CgiarEntityTypeOption(4, 'centers');
  public static readonly INITIATIVE = new CgiarEntityTypeOption(
    6,
    'initiatives',
  );
  public static readonly IMPACT_AREA_PLATFORM = new CgiarEntityTypeOption(
    9,
    'impact-area-platforms',
  );
  public static readonly ONE_CGIAR_SGP = new CgiarEntityTypeOption(
    10,
    'one-cgiar-sgps',
  );
  public static readonly PLATFORM_KEY_MODULE = new CgiarEntityTypeOption(
    11,
    'one-cgiar-kfms',
  );
  public static readonly INITIATIVE_WORKPACKGAGE = new CgiarEntityTypeOption(
    12,
    'initiative-workpackages',
  );
  public static readonly SGP_WORKPACKAGE = new CgiarEntityTypeOption(
    13,
    'sgp-workpackages',
  );
  public static readonly OTHER_W3 = new CgiarEntityTypeOption(14, 'other-w3s');
  public static readonly BILATERAL = new CgiarEntityTypeOption(
    15,
    'bilaterals',
  );
  public static readonly MEGA_PROGRAM = new CgiarEntityTypeOption(
    16,
    'mega-programs',
  );
  public static readonly MEGA_PROGRAM_FLAGSHIP = new CgiarEntityTypeOption(
    17,
    'mega-program-flagships',
  );
  public static readonly MEGA_PROGRAM_WORKPACKAGE = new CgiarEntityTypeOption(
    18,
    'mega-program-workpackages',
  );
  public static readonly ONE_CGIAR_PLAT = new CgiarEntityTypeOption(
    19,
    'one-cgiar-platforms',
  );
  public static readonly ONE_CGIAR_PLATFORM_KEY_MODULE =
    new CgiarEntityTypeOption(20, 'one-cgiar-pkfm');
  public static readonly OFFI = new CgiarEntityTypeOption(21, 'offices');

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
