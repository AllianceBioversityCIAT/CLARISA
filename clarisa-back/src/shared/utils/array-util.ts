export class ArrayUtil {
  public static isArrayOfType<T>(
    arr: unknown[],
    typeChecker: (element: unknown) => element is T,
  ): arr is T[] {
    return arr.every(typeChecker);
  }
}

export type ArrayType<T> = T extends (infer U)[] ? U : T;
