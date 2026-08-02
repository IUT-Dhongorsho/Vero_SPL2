import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  LayoutGrid,
  Mail,
  MapPin,
  PenLine,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../components/ui/BrandIcons';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { StatTile } from '../components/ui/StatTile';
import { ActivityPanel } from './profile/ActivityPanel';
import { ProfileEditor } from './profile/ProfileEditor';
import {
  formatDuration,
  profileService,
  type ActivitySummary,
  type UserProfile,
} from '../services/profileService';
import { workService, type WorkStats } from '../services/workService';
import { projectService, type Project } from '../services/projectService';
import { fadeUp, stagger } from '../lib/motion';
import { cn } from '../utils/cn';

type Tab = 'overview' | 'activity' | 'edit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'edit', label: 'Edit profile' },
];

const LinkChip: React.FC<{ href: string; icon: React.ElementType; label: string }> = ({
  href,
  icon: Icon,
  label,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:border-border-strong hover:bg-muted transition-colors"
  >
    <Icon className="w-4 h-4 text-muted-foreground" />
    {label}
    <ExternalLink className="w-3.5 h-3.5 text-subtle-foreground" />
  </a>
);

export const ProfilePage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await profileService.get();
        if (!cancelled) setProfile(me);
      } catch {
        if (!cancelled) setError('Could not load your profile. Is the auth service running?');
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Each panel degrades on its own — a missing board service should not
      // blank out the whole page.
      const [summary, workStats, projectList] = await Promise.allSettled([
        profileService.activitySummary(30),
        workService.myStats(),
        projectService.getProjects(),
      ]);

      if (cancelled) return;
      if (summary.status === 'fulfilled') setActivity(summary.value);
      if (workStats.status === 'fulfilled') setStats(workStats.value);
      if (projectList.status === 'fulfilled') setProjects(projectList.value);
      setActivityLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const skills = useMemo(
    () =>
      (profile?.skills ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [profile?.skills]
  );

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const completionRate =
    stats && stats.assignedTotal > 0 ? Math.round((stats.assignedDone / stats.assignedTotal) * 100) : 0;

  if (loading) {
    return (
      <PageContainer title="Profile">
        <div className="space-y-6">
          <div className="surface rounded-2xl h-56 skeleton-shimmer" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface rounded-2xl h-28 skeleton-shimmer" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !profile) {
    return (
      <PageContainer title="Profile">
        <div className="surface rounded-2xl p-10 text-center">
          <p className="text-foreground font-medium mb-2">Profile unavailable</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Profile"
      subtitle={profile.username ? `@${profile.username}` : profile.email}
      topBarActions={
        tab !== 'edit' && (
          <AnimatedButton variant="secondary" size="sm" onClick={() => setTab('edit')}>
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </AnimatedButton>
        )
      }
    >
      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
        {/* ── Identity header ─────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp}
          className="relative surface rounded-2xl overflow-hidden"
        >
          <div className="h-28 md:h-32 bg-gradient-to-r from-accent/20 via-accent/8 to-transparent grid-backdrop" />

          <div className="px-6 md:px-8 pb-7 -mt-12 md:-mt-14">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              <div className="rounded-full ring-4 ring-card w-fit">
                <Avatar name={profile.name} src={profile.image} size="2xl" />
              </div>

              <div className="flex-1 min-w-0 md:pb-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                    {profile.name}
                  </h2>
                  {profile.emailVerified && (
                    <Badge tone="success">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  {profile.username && <span className="font-medium">@{profile.username}</span>}
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </span>
                  {profile.jobTitle && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      {profile.jobTitle}
                      {profile.department ? ` · ${profile.department}` : ''}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-5 text-foreground/90 leading-relaxed max-w-3xl">{profile.bio}</p>
            )}

            {skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} tone="accent">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {profile.linkedinUrl && (
                <LinkChip href={profile.linkedinUrl} icon={LinkedinIcon} label="LinkedIn" />
              )}
              {profile.githubUsername && (
                <LinkChip
                  href={`https://github.com/${profile.githubUsername}`}
                  icon={GithubIcon}
                  label={profile.githubUsername}
                />
              )}
              {profile.websiteUrl && <LinkChip href={profile.websiteUrl} icon={Globe} label="Website" />}
              {!profile.linkedinUrl && !profile.githubUsername && !profile.websiteUrl && (
                <button
                  onClick={() => setTab('edit')}
                  className="text-sm text-accent hover:underline font-medium cursor-pointer"
                >
                  Add your LinkedIn and other links →
                </button>
              )}
            </div>

            {memberSince && (
              <p className="mt-5 text-xs text-subtle-foreground">Member since {memberSince}</p>
            )}
          </div>
        </motion.section>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              className={cn(
                'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                tab === entry.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === entry.id && (
                <motion.span
                  layoutId="profile-tab"
                  className="absolute inset-0 rounded-lg bg-card shadow-soft"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{entry.label}</span>
            </button>
          ))}
        </motion.div>

        {tab === 'overview' && (
          <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                label="Projects"
                value={projects.length}
                icon={LayoutGrid}
                tone="accent"
                hint={`${stats?.boardsInvolved ?? 0} with work assigned to you.`}
              />
              <StatTile
                label="Tasks assigned"
                value={stats?.assignedTotal ?? 0}
                icon={BarChart3}
                hint={`${stats?.assignedInProgress ?? 0} in progress, ${stats?.assignedOverdue ?? 0} overdue.`}
              />
              <StatTile
                label="Completed"
                value={stats?.assignedDone ?? 0}
                icon={CheckCircle2}
                tone="success"
                hint={`${completionRate}% of everything assigned to you.`}
              />
              <StatTile
                label="Time on site"
                value={formatDuration(activity?.totalActiveSeconds ?? 0)}
                icon={Timer}
                hint={`${formatDuration(activity?.averageSecondsPerActiveDay ?? 0)} on an average active day.`}
              />
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
              <motion.section variants={fadeUp} className="surface rounded-2xl p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-1">Projects you are on</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Everything you own or have joined.
                </p>

                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    You have not joined a project yet.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-xl border border-border p-4 hover:border-border-strong transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-medium text-foreground truncate">{project.name}</p>
                          <Badge tone={project.userRole === 'admin' ? 'accent' : 'neutral'}>
                            {project.userRole}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {project.description || 'No description yet.'}
                        </p>
                        <p className="mt-3 text-xs text-subtle-foreground">
                          {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              <motion.section variants={fadeUp} className="surface rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">This week</h3>
                <p className="text-sm text-muted-foreground mb-5">Measured from presence heartbeats.</p>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Active time</span>
                      <span className="text-2xl font-semibold text-foreground tabular-nums">
                        {formatDuration(activity?.last7DaysSeconds ?? 0)}
                      </span>
                    </div>
                    <p className="text-xs text-subtle-foreground">Rolling seven days.</p>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                      <Clock3 className="w-4 h-4" /> Today
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatDuration(activity?.todayActiveSeconds ?? 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current streak</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {activity?.currentStreak ?? 0}{' '}
                      {activity?.currentStreak === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Personal tasks</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {stats?.personalDone ?? 0}/{stats?.personalTotal ?? 0} done
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setTab('activity')}
                  className="mt-6 w-full text-sm font-medium text-accent hover:underline cursor-pointer"
                >
                  See the full breakdown →
                </button>
              </motion.section>
            </div>
          </motion.div>
        )}

        {tab === 'activity' && <ActivityPanel summary={activity} loading={activityLoading} />}

        {tab === 'edit' && (
          <ProfileEditor
            profile={profile}
            onSaved={(updated) => {
              setProfile(updated);
              setTab('overview');
            }}
          />
        )}
      </motion.div>
    </PageContainer>
  );
};
