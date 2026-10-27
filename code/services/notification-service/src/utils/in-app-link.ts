/** Notifications only ever link inside the app: a path, never another site. */
export function inAppLink(value: unknown): string | null {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && value.length <= 500 ? value : null;
}
