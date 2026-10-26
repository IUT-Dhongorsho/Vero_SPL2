export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
};

export const groupTasksByDueDate = (tasks: any[]) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const groups = {
    today: [] as any[],
    tomorrow: [] as any[],
    thisWeek: [] as any[],
    later: [] as any[],
  };

  tasks.forEach(task => {
    const dueDate = new Date(task.dueDate);
    if (isSameDay(dueDate, today)) groups.today.push(task);
    else if (isSameDay(dueDate, tomorrow)) groups.tomorrow.push(task);
    else if (dueDate <= endOfWeek) groups.thisWeek.push(task);
    else groups.later.push(task);
  });

  return groups;
};

/** "just now", "5 minutes ago", "3 days ago", then a plain date after a month. */
export const timeAgo = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const steps: [number, string][] = [
    [60, 'minute'],
    [60 * 60, 'hour'],
    [60 * 60 * 24, 'day'],
    [60 * 60 * 24 * 7, 'week'],
  ];
  if (seconds < 60 * 60 * 24 * 30) {
    const [size, unit] = [...steps].reverse().find(([size]) => seconds >= size) ?? steps[0];
    const n = Math.max(1, Math.round(seconds / size));
    return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  }
  return formatDate(date);
};
