import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarCheck, Clock, Flame, Timer } from 'lucide-react';
import { StatTile } from '../../components/ui/StatTile';
import { formatDuration, type ActivitySummary } from '../../services/profileService';
import { fadeUp, stagger } from '../../lib/motion';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Home',
  '/inbox': 'Inbox',
  '/calendar': 'Calendar',
  '/work': 'My work',
  '/work/board': 'My work',
  '/tasks': 'My work',
  '/progress': 'My work',
  '/projects': 'Projects',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/files': 'Recent files',
};

function labelForRoute(route: string): string {
  if (ROUTE_LABELS[route]) return ROUTE_LABELS[route];
  if (route.startsWith('/project/:id/module')) return 'Module workspace';
  if (route.startsWith('/project')) return 'Project';
  return route;
}

const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface-elevated rounded-xl px-3.5 py-2.5 text-sm">
      <p className="font-medium text-foreground">
        {new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      <p className="text-muted-foreground mt-0.5">{formatDuration(payload[0].value)} active</p>
    </div>
  );
};

export const ActivityPanel: React.FC<{ summary: ActivitySummary | null; loading: boolean }> = ({
  summary,
  loading,
}) => {
  const chartData = useMemo(
    () => (summary?.daily ?? []).map((d) => ({ day: d.day, seconds: d.activeSeconds })),
    [summary]
  );

  const busiestDay = useMemo(() => {
    if (!summary?.daily?.length) return null;
    return summary.daily.reduce((best, d) => (d.activeSeconds > best.activeSeconds ? d : best));
  }, [summary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface rounded-2xl p-5 h-28 skeleton-shimmer" />
          ))}
        </div>
        <div className="surface rounded-2xl h-72 skeleton-shimmer" />
      </div>
    );
  }

  const hasAnyActivity = (summary?.totalActiveSeconds ?? 0) > 0;

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Time today"
          value={formatDuration(summary?.todayActiveSeconds ?? 0)}
          icon={Clock}
          tone="accent"
          hint="Counted only while this tab is open and you are active."
        />
        <StatTile
          label="This week"
          value={formatDuration(summary?.last7DaysSeconds ?? 0)}
          icon={Timer}
          hint="Rolling seven days."
        />
        <StatTile
          label="All time"
          value={formatDuration(summary?.totalActiveSeconds ?? 0)}
          icon={CalendarCheck}
          hint={`Across ${summary?.activeDays ?? 0} active ${summary?.activeDays === 1 ? 'day' : 'days'}.`}
        />
        <StatTile
          label="Current streak"
          value={summary?.currentStreak ?? 0}
          suffix={summary?.currentStreak === 1 ? 'day' : 'days'}
          icon={Flame}
          tone={summary?.currentStreak ? 'warning' : 'neutral'}
          hint={`Longest run: ${summary?.longestStreak ?? 0} ${summary?.longestStreak === 1 ? 'day' : 'days'}.`}
        />
      </motion.div>

      <motion.section variants={fadeUp} className="surface rounded-2xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Time on site</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Last {summary?.daily.length ?? 30} days, measured from presence heartbeats.
            </p>
          </div>
          {busiestDay && busiestDay.activeSeconds > 0 && (
            <p className="text-sm text-muted-foreground">
              Busiest day{' '}
              <span className="text-foreground font-medium">
                {new Date(busiestDay.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>{' '}
              at {formatDuration(busiestDay.activeSeconds)}
            </p>
          )}
        </div>

        {hasAnyActivity ? (
          <div className="h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  }
                  minTickGap={28}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) => (value >= 3600 ? `${Math.round(value / 3600)}h` : `${Math.round(value / 60)}m`)}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                <Area
                  type="monotone"
                  dataKey="seconds"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#activityFill)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 grid place-items-center text-center">
            <div>
              <p className="text-foreground font-medium">No activity recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                Tracking starts the moment you log in. Come back after using the app for a while and
                this chart will fill in.
              </p>
            </div>
          </div>
        )}
      </motion.section>

      {(summary?.topRoutes?.length ?? 0) > 0 && (
        <motion.section variants={fadeUp} className="surface rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Where your time goes</h3>
          <p className="text-sm text-muted-foreground mb-5">Ranked by recorded active time.</p>

          <div className="space-y-3.5">
            {summary!.topRoutes.map((route, index) => {
              const max = summary!.topRoutes[0].activeSeconds || 1;
              const share = Math.round((route.activeSeconds / max) * 100);
              return (
                <div key={route.route}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{labelForRoute(route.route)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDuration(route.activeSeconds)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-accent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};
