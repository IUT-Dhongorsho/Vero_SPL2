/** The message an API failure carries, or a fallback written for the user. */
export function errorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (error instanceof Error && error.message && !/status code|network error/i.test(error.message)) return error.message;
  return fallback;
}

/** Machine-readable code from the API's `{ error, code }` shape. */
export function errorCode(error: unknown): string | undefined {
  return (error as any)?.response?.data?.code;
}
