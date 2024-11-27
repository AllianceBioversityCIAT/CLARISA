export class PRMSApplication {
  public static readonly ALL = new PRMSApplication('All', 'all', 'all');
  public static readonly REPORTING_TOOL = new PRMSApplication(
    'Reporting Tool',
    'reporting',
    'phases_reporting',
  );
  public static readonly TOC = new PRMSApplication(
    'Theory of Change',
    'toc',
    'phases_toc',
  );
  public static readonly OST = new PRMSApplication(
    'Online Submission Tool',
    'ost',
    'phases_ost',
  );
  public static readonly IPSR = new PRMSApplication(
    'Innovation Packages and Scaling Readiness',
    'ipsr',
    'phases_ipsr',
  );
  public static readonly RISK = new PRMSApplication(
    'Risk Management',
    'risk',
    'phases_risk',
  );

  private constructor(
    public readonly prettyName: string,
    public readonly simpleName: string,
    public readonly tableName: string,
  ) {}

  public static getfromTableName(
    tableName: string,
  ): PRMSApplication | undefined {
    return (Object.values(this) as PRMSApplication[]).find(
      (p) => p.tableName === tableName,
    );
  }

  public static getfromPrettyName(
    prettyName: string,
  ): PRMSApplication | undefined {
    return (Object.values(this) as PRMSApplication[]).find(
      (p) => p.prettyName === prettyName,
    );
  }

  public static getfromSimpleName(
    simpleName: string,
  ): PRMSApplication | undefined {
    return (Object.values(this) as PRMSApplication[]).find(
      (p) => p.simpleName === simpleName,
    );
  }

  public static getAllPhaseTables(): PRMSApplication[] {
    return Object.values(PRMSApplication).filter(
      (v) => v != PRMSApplication.ALL,
    );
  }

  public static getAsEnumLikeObject(): { [key: string]: string } {
    const enumeration: { [key: string]: string } = {};
    (Object.values(this) as PRMSApplication[]).forEach((mo) => {
      const key = mo.simpleName.toUpperCase().replace(/ /g, '_');
      enumeration[key] = mo.simpleName;
    });

    return enumeration;
  }
}
