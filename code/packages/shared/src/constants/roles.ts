/** Project roles, highest privilege first. */
export const PROJECT_ROLES = ['admin', 'member', 'viewer'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

/** What each project role may do. Modules inherit their project's roles. */
export const PROJECT_PERMISSIONS = {
  admin: { manageProject: true, manageMembers: true, manageModules: true, write: true },
  member: { manageProject: false, manageMembers: false, manageModules: false, write: true },
  viewer: { manageProject: false, manageMembers: false, manageModules: false, write: false },
} as const satisfies Record<ProjectRole, Record<string, boolean>>;

export function isProjectRole(value: unknown): value is ProjectRole {
  return typeof value === 'string' && (PROJECT_ROLES as readonly string[]).includes(value);
}

export function canWrite(role: ProjectRole | null | undefined): boolean {
  return !!role && PROJECT_PERMISSIONS[role].write;
}
