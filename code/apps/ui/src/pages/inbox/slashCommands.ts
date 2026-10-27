import { workService } from '../../services/workService';
import { apiClient } from '../../utils/apiClient';
import type { ChatNotice } from '../../services/inboxService';

export interface SlashCommand {
  name: string;
  args?: string;
  description: string;
  example: string;
}

/**
 * Commands available in the composer. `/help` renders this list, so it is the
 * only documentation the user sees in-app.
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'Show commands and how to mention people', example: '/help' },
  {
    name: 'task',
    args: '<title> [when]',
    description: 'Add a task to your Tasks, optionally with a due date',
    example: '/task review the wireframes friday',
  },
  {
    name: 'remind',
    args: '<what> <when>',
    description: 'Get a notification at the time you choose',
    example: '/remind standup tomorrow 9am',
  },
];

export type CommandResult = { kind: 'notice'; notice: ChatNotice } | { kind: 'error'; content: string };

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** A day with no time means the start of the working day. */
const DEFAULT_HOUR = 9;

/** "5pm", "5:30 pm", "17:30", "at 5". A bare number is never a time. */
const TIME = /(?:^|\s)(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)$|(?:^|\s)(?:at\s+)?(\d{1,2}):(\d{2})$|(?:^|\s)at\s+(\d{1,2})$/;

function readTime(text: string): { rest: string; hours: number; minutes: number } | null {
  const match = text.match(TIME);
  if (!match) return null;

  let hours: number;
  let minutes: number;
  if (match[1] !== undefined) {
    hours = Number(match[1]) % 12 + (match[3] === 'pm' ? 12 : 0);
    minutes = Number(match[2] ?? 0);
  } else if (match[4] !== undefined) {
    hours = Number(match[4]);
    minutes = Number(match[5]);
  } else {
    // "at 5" is an afternoon meeting far more often than a 5 am one.
    hours = Number(match[6]);
    if (hours >= 1 && hours <= 7) hours += 12;
    minutes = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return { rest: text.slice(0, match.index).trim(), hours, minutes };
}

function readDay(text: string, now: Date): Date | null {
  const day = new Date(now);
  day.setSeconds(0, 0);

  if (text === 'today' || text === '') return day;
  if (text === 'tonight') return day;
  if (text === 'tomorrow') {
    day.setDate(day.getDate() + 1);
    return day;
  }
  if (text === 'next week') {
    day.setDate(day.getDate() + 7);
    return day;
  }

  const weekday = WEEKDAYS.indexOf(text.replace(/^(next|on)\s+/, ''));
  if (weekday >= 0) {
    // Always forward, so "friday" said on a Friday means next week's.
    day.setDate(day.getDate() + (((weekday - now.getDay() + 7) % 7) || 7));
    return day;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  // "nov 2", "2 nov", "november 2nd"
  const monthDay =
    text.match(/^([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?$/) ?? text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})$/);
  if (monthDay) {
    const [monthWord, dayNumber] = /^\d/.test(monthDay[1]) ? [monthDay[2], monthDay[1]] : [monthDay[1], monthDay[2]];
    const month = MONTHS.indexOf(monthWord.slice(0, 3));
    if (month < 0) return null;
    const date = new Date(now.getFullYear(), month, Number(dayNumber));
    // A date already past this year means next year's.
    if (date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }
  return null;
}

/**
 * Understands "in 30 minutes", "in 2 hours", "in 3 days", "tomorrow 9am",
 * "friday at 5pm", "next week", "tonight", "nov 2", "2026-11-02", or a time on
 * its own ("5pm" is today, or tomorrow once it has passed). Null when the text
 * is not a time.
 */
export function parseWhen(input: string, now = new Date()): Date | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;

  const relative = text.match(/^in (\d+) ?(minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w)$/);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2][0];
    const date = new Date(now);
    if (unit === 'm') date.setMinutes(date.getMinutes() + amount);
    else if (unit === 'h') date.setHours(date.getHours() + amount);
    else {
      date.setDate(date.getDate() + amount * (unit === 'w' ? 7 : 1));
      date.setHours(DEFAULT_HOUR, 0, 0, 0);
    }
    return date;
  }

  const time = readTime(text);
  const dayText = time ? time.rest : text;
  if (!time && dayText === '') return null;

  const day = readDay(dayText, now);
  if (!day) return null;

  if (time) day.setHours(time.hours, time.minutes, 0, 0);
  else day.setHours(dayText === 'tonight' ? 20 : DEFAULT_HOUR, 0, 0, 0);

  // A bare time that has already passed today means tomorrow.
  if (time && dayText === '' && day.getTime() <= now.getTime()) day.setDate(day.getDate() + 1);
  return day;
}

/**
 * Splits "ship the build tomorrow 9am" into the subject and the time at its
 * end. "subject | when" works too. `when` is null when there is no time.
 */
export function splitWhen(argument: string, now = new Date()): { subject: string; when: Date | null; unread?: string } {
  if (argument.includes('|')) {
    const [subject, whenText] = argument.split('|').map((part) => part.trim());
    if (!whenText) return { subject, when: null };
    const when = parseWhen(whenText, now);
    return when ? { subject, when } : { subject, when: null, unread: whenText };
  }

  const words = argument.trim().split(/\s+/);
  // Longest time phrase first, so "next friday" wins over "friday".
  for (let take = Math.min(5, words.length - 1); take >= 1; take--) {
    const when = parseWhen(words.slice(-take).join(' '), now);
    if (when) return { subject: words.slice(0, -take).join(' '), when };
  }
  return { subject: argument.trim(), when: null };
}

/**
 * Runs a composer command. Anything not starting with `/` is a plain message,
 * which the caller handles. `link` is the page the chat is on; reminders open it.
 */
export async function runSlashCommand(raw: string, link: string): Promise<CommandResult | null> {
  if (!raw.startsWith('/')) return null;

  const [rawName, ...rest] = raw.slice(1).split(' ');
  const name = rawName.toLowerCase();
  const argument = rest.join(' ').trim();

  switch (name) {
    case 'help':
      return { kind: 'notice', notice: { kind: 'help' } };

    case 'task': {
      if (!argument) return { kind: 'error', content: 'Add a title, e.g. /task review the wireframes friday' };
      const { subject, when, unread } = splitWhen(argument);
      if (unread) return { kind: 'error', content: `“${unread}” is not a date I understand. Try “friday” or “nov 2”.` };
      if (!subject) return { kind: 'error', content: 'Add a title before the date.' };
      try {
        await workService.createPersonal({ title: subject, dueDate: when ? when.toISOString() : null });
        return { kind: 'notice', notice: { kind: 'task', title: subject, due: when ? when.toISOString() : null } };
      } catch {
        return { kind: 'error', content: 'The task could not be added. Check your connection and try again.' };
      }
    }

    case 'remind': {
      if (!argument) return { kind: 'error', content: 'Say what and when, e.g. /remind standup tomorrow 9am' };
      const { subject, when, unread } = splitWhen(argument);
      if (unread) return { kind: 'error', content: `“${unread}” is not a time I understand. Try “in 2 hours” or “tomorrow 9am”.` };
      if (!when) return { kind: 'error', content: 'Add when, e.g. /remind standup tomorrow 9am' };
      if (!subject) return { kind: 'error', content: 'Say what to remind you about before the time.' };
      if (when.getTime() <= Date.now()) return { kind: 'error', content: 'That time has already passed.' };
      try {
        await apiClient.post('/notifications/reminders', { text: subject, remindAt: when.toISOString(), link });
        return { kind: 'notice', notice: { kind: 'reminder', text: subject, at: when.toISOString() } };
      } catch (error: any) {
        return { kind: 'error', content: error?.response?.data?.error ?? 'The reminder could not be set. Try again.' };
      }
    }

    default:
      return { kind: 'error', content: `There is no /${name} command. Type /help to see what you can use.` };
  }
}

/**
 * Who a message mentions. Matches full names first, then a first name when
 * only one member has it. `@all` and `@everyone` mean the whole channel.
 */
export function findMentions(text: string, members: { id: string; name: string }[]) {
  const mentionsAll = /(^|\s)@(all|everyone)\b/i.test(text);
  const lower = text.toLowerCase();
  const ids = new Set<string>();

  for (const member of members) {
    if (lower.includes(`@${member.name.toLowerCase()}`)) ids.add(member.id);
  }
  for (const member of members) {
    const first = member.name.split(' ')[0]?.toLowerCase();
    if (!first || ids.has(member.id)) continue;
    const shared = members.filter((m) => m.name.split(' ')[0]?.toLowerCase() === first).length > 1;
    if (!shared && new RegExp(`(^|\\s)@${escapeRegExp(first)}\\b`, 'i').test(text)) ids.add(member.id);
  }
  return { mentions: [...ids], mentionsAll };
}

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
