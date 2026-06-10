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
