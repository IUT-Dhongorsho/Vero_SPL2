/**
 * Machine-readable error codes returned as `{ error, code }` so the client can
 * react to a failure without parsing the human-readable message.
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  /** The last admin of a project cannot leave or be demoted. */
  LAST_ADMIN: 'LAST_ADMIN',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_BLOCKED: 'FILE_TYPE_BLOCKED',
  /** An optional integration (Gemini, SMTP, …) is not configured. */
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  UPSTREAM_FAILED: 'UPSTREAM_FAILED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiError {
  error: string;
  code?: ErrorCode;
}
