export class FrameworkOptions {
  public static readonly OLD = new FrameworkOptions(1, 'old');
  public static readonly PORTFOLIO_2022 = new FrameworkOptions(2, '2022');
  public static readonly PORTFOLIO_2025 = new FrameworkOptions(3, '2025');
  private constructor(
    public readonly framework_id: number,
    public readonly path: string,
  ) {}

  public static getfromPath(path: string): FrameworkOptions | undefined {
    return (Object.values(this) as FrameworkOptions[]).find(
      (p) => p.path === path,
    );
  }

  public static getfromSourceId(
    entity_type_id: number,
  ): FrameworkOptions | undefined {
    return (Object.values(this) as FrameworkOptions[]).find(
      (p) => p.framework_id === entity_type_id,
    );
  }
}
