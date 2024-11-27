export class PartnerStatus {
  public static readonly ALL = new PartnerStatus('All', 'all');
  public static readonly PENDING = new PartnerStatus('Pending', 'pending');
  public static readonly ACCEPTED = new PartnerStatus('Accepted', 'accepted');
  public static readonly REJECTED = new PartnerStatus('Rejected', 'rejected');

  private constructor(
    public readonly name: string,
    public readonly path: string,
  ) {}

  public static getfromPath(path: string): PartnerStatus | undefined {
    return (Object.values(this) as PartnerStatus[]).find(
      (p) => p.path === path,
    );
  }

  public static getfromName(name: string): PartnerStatus | undefined {
    return (Object.values(this) as PartnerStatus[]).find(
      (p) => p.name === name,
    );
  }

  public static getAsEnumLikeObject(): { [key: string]: string } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as PartnerStatus[]).forEach((ps) => {
      enumeration[ps.name.toUpperCase()] = ps.path;
    });

    return enumeration;
  }
}
