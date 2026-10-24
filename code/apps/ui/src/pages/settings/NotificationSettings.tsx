import React, { useEffect, useState } from 'react';
import { toast } from '../../components/Providers/ToastProvider';
import { apiClient } from '../../utils/apiClient';
import { currentSubscription, disablePush, enablePush, pushSupported } from '../../lib/push';
import { errorMessage } from '../../utils/errors';
import { SettingsSection, Toggle } from './SettingsSection';

interface Preferences {
  emailNotifications: boolean;
  emailAvailable: boolean;
  pushAvailable: boolean;
  pushPublicKey: string | null;
  pushDevices: { id: string; deviceLabel: string | null }[];
}

export const NotificationSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [failed, setFailed] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState<'email' | 'push' | null>(null);

  useEffect(() => {
    apiClient
      .get<Preferences>('/notifications/preferences')
      .then(({ data }) => setPrefs(data))
      .catch(() => setFailed(true));
    currentSubscription().then((sub) => setPushOn(!!sub));
  }, []);

  const setEmail = async (next: boolean) => {
    if (!prefs) return;
    setBusy('email');
    try {
      await apiClient.patch('/notifications/preferences', { emailNotifications: next });
      setPrefs({ ...prefs, emailNotifications: next });
      toast.success(next ? 'You’ll get emails for new activity' : 'Emails turned off');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save that'));
    } finally {
      setBusy(null);
    }
  };

  const setPush = async (next: boolean) => {
    if (!prefs?.pushPublicKey) return;
    setBusy('push');
    try {
      if (next) await enablePush(prefs.pushPublicKey);
      else await disablePush();
      setPushOn(next);
      toast.success(next ? 'This device will show notifications' : 'Notifications turned off on this device');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change notifications on this device'));
    } finally {
      setBusy(null);
    }
  };

  if (failed) {
    return (
      <SettingsSection title="Notifications">
        <p className="text-sm text-muted-foreground">Notification settings could not be loaded. Try again in a moment.</p>
      </SettingsSection>
    );
  }

  const pushHint = !pushSupported()
    ? 'This browser does not support notifications.'
    : !prefs?.pushAvailable
      ? 'Push notifications are not set up on this server.'
      : 'Shows a system notification even when Vero is in the background.';

  return (
    <SettingsSection
      title="Notifications"
      description="The bell always shows assignments, invitations, new files and connection requests. Choose where else you hear about them."
    >
      {prefs ? (
        <div className="space-y-5 max-w-xl">
          <Toggle
            label="Email"
            hint={
              prefs.emailAvailable
                ? 'One email per new activity — a burst of uploads or changes is grouped.'
                : 'Email is not set up on this server.'
            }
            checked={prefs.emailNotifications && prefs.emailAvailable}
            disabled={!prefs.emailAvailable}
            busy={busy === 'email'}
            onChange={setEmail}
          />
          <div className="h-px bg-border" />
          <Toggle
            label="Push on this device"
            hint={pushHint}
            checked={pushOn}
            disabled={!pushSupported() || !prefs.pushAvailable}
            busy={busy === 'push'}
            onChange={setPush}
          />
          {prefs.pushDevices.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Push is on for {prefs.pushDevices.length} {prefs.pushDevices.length === 1 ? 'device' : 'devices'}:{' '}
              {prefs.pushDevices.map((d) => d.deviceLabel ?? 'a browser').join(', ')}.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-w-xl">
          <div className="h-10 rounded-xl skeleton-shimmer" />
          <div className="h-10 rounded-xl skeleton-shimmer" />
        </div>
      )}
    </SettingsSection>
  );
};
