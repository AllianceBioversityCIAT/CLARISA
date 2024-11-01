export class RegionTypeEnum {
  public static readonly CGIAR_REGION = new RegionTypeEnum(1, 'one-cgiar');
  public static readonly UN_REGION = new RegionTypeEnum(2, 'un-region');

  private constructor(
    public readonly id: number,
    public readonly name: string,
  ) {}

  public static getfromName(name: string): RegionTypeEnum | undefined {
    return (Object.values(this) as RegionTypeEnum[]).find(
      (p) => p.name === name,
    );
  }

  public static getAsEnumLikeObject(): { [key: string]: string } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as RegionTypeEnum[]).forEach((mo) => {
      enumeration[mo.name] = mo.name;
    });

    return enumeration;
  }

  public toString(): string {
    return this.name;
  }
}
