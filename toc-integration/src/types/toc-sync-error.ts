export type TocSyncErrorCode =
  | "TOC_NOT_FOUND"
  | "TOC_TIMEOUT"
  | "TOC_HTTP_ERROR"
  | "TOC_NETWORK"
  | "INVALID_REQUEST"
  | "INVALID_PAYLOAD"
  | "PLAUSIBILITY_NO_RESULTS"
  | "PLAUSIBILITY_NO_INDICATORS"
  | "PHASE_MISMATCH"
  | "VERSION_MISMATCH";

export interface TocSyncErrorOptions {
  statusCode: number;
  code: TocSyncErrorCode;
  message: string;
  /** Whether the sync flow should send a Slack `:alert:` for this error. */
  notifySlack?: boolean;
  details?: Record<string, unknown>;
}

/**
 * Typed error raised by the sync flows so the controller can answer with the
 * right HTTP status (404 "not published in that phase", 409 guard, 422
 * payload mismatch...) instead of a bare 500 with an empty body.
 */
export class TocSyncError extends Error {
  statusCode: number;
  code: TocSyncErrorCode;
  notifySlack: boolean;
  details?: Record<string, unknown>;

  constructor(options: TocSyncErrorOptions) {
    super(options.message);
    // Target is es5: restore the prototype chain so `instanceof` works.
    Object.setPrototypeOf(this, TocSyncError.prototype);
    this.name = "TocSyncError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.notifySlack = options.notifySlack ?? true;
    this.details = options.details;
  }
}

export function isTocSyncError(err: unknown): err is TocSyncError {
  return (
    err instanceof TocSyncError ||
    (!!err &&
      typeof err === "object" &&
      (err as any).name === "TocSyncError" &&
      typeof (err as any).statusCode === "number")
  );
}
