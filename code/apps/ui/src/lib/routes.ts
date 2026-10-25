import type { WorkItem } from '../services/workService';

/**
 * Every in-app link is built here, so a task, module or project opens the
 * same way whether it was clicked on Home, My work, search or a notification.
 */

export type ModuleTool = 'board' | 'notes' | 'chat' | 'meet';

export const projectHref = (projectId: string, tab?: 'members' | 'files' | 'settings') =>
  tab ? `/project/${projectId}?tab=${tab}` : `/project/${projectId}`;

export const moduleHref = (projectId: string, moduleId: string, tool?: ModuleTool) =>
  `/project/${projectId}/module/${moduleId}${tool ? `/${tool}` : ''}`;

/** Opens the task itself: on its board for project work, on My work otherwise. */
export function taskHref(task: Pick<WorkItem, 'id' | 'source' | 'projectId' | 'moduleId'>): string {
  if (task.source === 'project' && task.projectId && task.moduleId) {
    return `${moduleHref(task.projectId, task.moduleId, 'board')}?task=${task.id}`;
  }
  return `/work?task=${task.id}`;
}

/** A crumb in the top bar; the last one is the current page and has no link. */
export interface Crumb {
  label: string;
  to?: string;
}

export const projectCrumbs = (project?: { id: string; name: string } | null): Crumb[] => [
  { label: 'Projects', to: '/projects' },
  ...(project ? [{ label: project.name, to: projectHref(project.id) }] : []),
];

/**
 * Inside a module the top bar reads "Projects › Altair" over the module's
 * name; the module bar below it says which tool is open.
 */
export const moduleCrumbs = (module?: { project: { id: string; name: string } | null } | null): Crumb[] =>
  projectCrumbs(module?.project);
