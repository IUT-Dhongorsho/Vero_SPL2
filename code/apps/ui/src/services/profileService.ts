import { apiClient } from '../utils/apiClient';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  jobTitle: string | null;
  department: string | null;
  phoneNumber: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUsername: string | null;
  websiteUrl: string | null;
  skills: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  role: string;
}

export type ProfileUpdate = Partial<
  Pick<
    UserProfile,
    | 'name'
    | 'username'
    | 'firstName'
    | 'lastName'
    | 'bio'
    | 'jobTitle'
    | 'department'
    | 'phoneNumber'
    | 'location'
    | 'image'
    | 'linkedinUrl'
    | 'githubUsername'
    | 'websiteUrl'
    | 'skills'
    | 'timezone'
  >
>;

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  jobTitle: string | null;
}

export interface ActivitySummary {
  totalActiveSeconds: number;
  todayActiveSeconds: number;
  last7DaysSeconds: number;
  averageSecondsPerActiveDay: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  firstSeenAt: string | null;
  daily: { day: string; activeSeconds: number; sessionCount: number }[];
  topRoutes: { route: string; activeSeconds: number }[];
}

export const profileService = {
  async get(): Promise<UserProfile> {
    const { data } = await apiClient.get('/user/profile');
    return data;
  },

  async update(patch: ProfileUpdate): Promise<UserProfile> {
    const { data } = await apiClient.patch('/user/profile', patch);
    return data.user;
  },

  async search(query: string): Promise<DirectoryUser[]> {
    if (query.trim().length < 2) return [];
    const { data } = await apiClient.get('/users/search', { params: { q: query } });
    return data;
  },

  async resolve(ids: string[]): Promise<DirectoryUser[]> {
    if (ids.length === 0) return [];
    const { data } = await apiClient.get('/users/bulk', { params: { ids: ids.join(',') } });
    return data;
  },

  async activitySummary(days = 30): Promise<ActivitySummary> {
    const { data } = await apiClient.get('/user/activity/summary', {
      params: { days, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });
    return data;
  },

  async heartbeat(route: string): Promise<void> {
    await apiClient.post('/user/activity/heartbeat', {
      route,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },
};

/** "2h 45m" / "45m" / "38s" — compact enough for stat tiles. */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 60) return `${Math.max(0, Math.round(totalSeconds))}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
