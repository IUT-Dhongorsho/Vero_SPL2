import { workService } from '../../services/workService';

export interface SlashCommand {
  name: string;
  args?: string;
  description: string;
}

/**
 * Commands available in the Inbox composer. Keep this list and the `/help`
 * output in sync — it is the only documentation the user sees in-app.
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'List every command available here' },
  { name: 'me', args: '<action>', description: 'Send an action, e.g. /me is heading out' },
  { name: 'shrug', args: '[text]', description: 'Append ¯\\_(ツ)_/¯ to your message' },
  { name: 'spoiler', args: '<text>', description: 'Hide the text until the reader clicks it' },
  { name: 'task', args: '<title>', description: 'Create a personal task from this chat' },
  {
    name: 'remind',
    args: '<title> | <when>',
    description: 'Create a task with a due date, e.g. /remind ship build | tomorrow',
  },
  { name: 'clear', description: 'Clear this conversation from your view (nothing is deleted)' },
];

export type CommandResult =
  | { kind: 'send'; content: string; type: 'text' | 'action' }
  | { kind: 'notice'; content: string }
  | { kind: 'clear' }
  | { kind: 'error'; content: string };

/**
 * Understands "tomorrow", "in 3 days", "friday", "next week" and plain dates.
 * Returns null when nothing sensible can be parsed.
 */
export function parseWhen(input: string): Date | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const now = new Date();
  const atNoon = (date: Date) => {
    date.setHours(12, 0, 0, 0);
    return date;
  };

  if (text === 'today') return atNoon(new Date());
  if (text === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return atNoon(d);
  }
  if (text === 'next week') {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return atNoon(d);
  }

  const inDays = text.match(/^in\s+(\d+)\s*(day|days|d)$/);
  if (inDays) {
    const d = new Date();
    d.setDate(d.getDate() + Number(inDays[1]));
    return atNoon(d);
  }

  const inWeeks = text.match(/^in\s+(\d+)\s*(week|weeks|w)$/);
  if (inWeeks) {
    const d = new Date();
    d.setDate(d.getDate() + Number(inWeeks[1]) * 7);
    return atNoon(d);
  }

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = weekdays.indexOf(text.replace(/^next\s+/, ''));
  if (targetDay >= 0) {
    const d = new Date();
    // Always look forward, so "friday" on a Friday means the next one.
    const delta = ((targetDay - now.getDay() + 7) % 7) || 7;
    d.setDate(d.getDate() + delta);
    return atNoon(d);
  }

  const parsed = new Date(input.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function helpText(): string {
  return [
    'Commands you can use here:',
    ...SLASH_COMMANDS.map((c) => `  /${c.name}${c.args ? ` ${c.args}` : ''} — ${c.description}`),
  ].join('\n');
}

/**
 * Runs a composer command. Anything not starting with `/` is a plain message,
 * which the caller handles.
 */
export async function runSlashCommand(raw: string): Promise<CommandResult | null> {
  if (!raw.startsWith('/')) return null;

  const [rawName, ...rest] = raw.slice(1).split(' ');
  const name = rawName.toLowerCase();
  const argument = rest.join(' ').trim();

  switch (name) {
    case 'help':
      return { kind: 'notice', content: helpText() };

    case 'me':
      if (!argument) return { kind: 'error', content: 'Usage: /me <action>' };
      return { kind: 'send', content: argument, type: 'action' };

    case 'shrug':
      return { kind: 'send', content: `${argument} ¯\\_(ツ)_/¯`.trim(), type: 'text' };

    case 'spoiler':
      if (!argument) return { kind: 'error', content: 'Usage: /spoiler <text>' };
      // The renderer looks for this marker and blurs the contents until clicked.
      return { kind: 'send', content: `||${argument}||`, type: 'text' };

    case 'clear':
      return { kind: 'clear' };

    case 'task': {
      if (!argument) return { kind: 'error', content: 'Usage: /task <title>' };
      try {
        await workService.createPersonal({ title: argument });
        return { kind: 'notice', content: `Added “${argument}” to your Tasks.` };
      } catch {
        return { kind: 'error', content: 'Could not create that task.' };
      }
    }

    case 'remind': {
      const [title, when] = argument.split('|').map((part) => part.trim());
      if (!title) return { kind: 'error', content: 'Usage: /remind <title> | <when>' };

      const due = when ? parseWhen(when) : null;
      if (when && !due) {
        return { kind: 'error', content: `I could not read “${when}” as a date.` };
      }

      try {
        await workService.createPersonal({
          title,
          dueDate: due ? due.toISOString() : null,
          priority: 'high',
        });
        return {
          kind: 'notice',
          content: due
            ? `Reminder set: “${title}” due ${due.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}.`
            : `Reminder set: “${title}”.`,
        };
      } catch {
        return { kind: 'error', content: 'Could not create that reminder.' };
      }
    }

    default:
      return { kind: 'error', content: `Unknown command “/${name}”. Try /help.` };
  }
}
