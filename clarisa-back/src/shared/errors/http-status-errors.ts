import { HttpStatus } from '@nestjs/common';

/**
 * Represents an HTTP status error type that excludes certain informational and successful status codes.
 *
 * This type is derived from the `HttpStatus` enum, excluding the following status codes:
 * - CONTINUE
 * - SWITCHING_PROTOCOLS
 * - PROCESSING
 * - EARLYHINTS
 * - OK
 * - CREATED
 * - ACCEPTED
 * - NON_AUTHORITATIVE_INFORMATION
 * - NO_CONTENT
 * - RESET_CONTENT
 * - PARTIAL_CONTENT
 * - AMBIGUOUS
 * - MOVED_PERMANENTLY
 * - FOUND
 * - SEE_OTHER
 * - NOT_MODIFIED
 * - TEMPORARY_REDIRECT
 * - PERMANENT_REDIRECT
 */
export type HttpStatusError = Exclude<
  HttpStatus,
  | HttpStatus.CONTINUE
  | HttpStatus.SWITCHING_PROTOCOLS
  | HttpStatus.PROCESSING
  | HttpStatus.EARLYHINTS
  | HttpStatus.OK
  | HttpStatus.CREATED
  | HttpStatus.ACCEPTED
  | HttpStatus.NON_AUTHORITATIVE_INFORMATION
  | HttpStatus.NO_CONTENT
  | HttpStatus.RESET_CONTENT
  | HttpStatus.PARTIAL_CONTENT
  | HttpStatus.AMBIGUOUS
  | HttpStatus.MOVED_PERMANENTLY
  | HttpStatus.FOUND
  | HttpStatus.SEE_OTHER
  | HttpStatus.NOT_MODIFIED
  | HttpStatus.TEMPORARY_REDIRECT
  | HttpStatus.PERMANENT_REDIRECT
>;
