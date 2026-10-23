import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AtSign, Briefcase, Globe, Image as ImageIcon, MapPin, Phone, Sparkles, User } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../../components/ui/BrandIcons';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Avatar } from '../../components/ui/Avatar';
import { toast } from '../../components/Providers/ToastProvider';
import { profileService, type ProfileUpdate, type UserProfile } from '../../services/profileService';
import { useAuthStore } from '../../stores/auth.store';
import { fadeUp } from '../../lib/motion';

interface FieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  multiline?: boolean;
  maxLength?: number;
}

const Field: React.FC<FieldProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  multiline,
  maxLength,
}) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all resize-y leading-relaxed"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
      />
    )}
    {hint && <p className="mt-1.5 text-xs text-subtle-foreground">{hint}</p>}
  </div>
);

const EDITABLE_KEYS = [
  'name',
  'username',
  'jobTitle',
  'department',
  'location',
  'phoneNumber',
  'bio',
  'image',
  'linkedinUrl',
  'githubUsername',
  'websiteUrl',
  'skills',
] as const;

type Draft = Record<(typeof EDITABLE_KEYS)[number], string>;

function draftFrom(profile: UserProfile): Draft {
  return EDITABLE_KEYS.reduce((acc, key) => {
    acc[key] = (profile[key] as string | null) ?? '';
    return acc;
  }, {} as Draft);
}

export const ProfileEditor: React.FC<{
  profile: UserProfile;
  onSaved: (profile: UserProfile) => void;
}> = ({ profile, onSaved }) => {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [saving, setSaving] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => setDraft(draftFrom(profile)), [profile]);

  const dirty = EDITABLE_KEYS.some((key) => draft[key] !== ((profile[key] as string | null) ?? ''));

  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send what actually changed, so an untouched username never trips
      // the uniqueness check.
      const patch: ProfileUpdate = {};
      for (const key of EDITABLE_KEYS) {
        if (draft[key] !== ((profile[key] as string | null) ?? '')) {
          (patch as Record<string, string>)[key] = draft[key].trim();
        }
      }

      const updated = await profileService.update(patch);
      onSaved(updated);

      if (currentUser) {
        setUser({
          ...currentUser,
          name: updated.name,
          email: updated.email,
          avatar: updated.image ?? undefined,
        });
      }

      toast.success('Profile updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div variants={fadeUp} className="space-y-6">
      <section className="surface rounded-2xl p-6 md:p-7">
        <h3 className="text-lg font-semibold text-foreground mb-1">Photo</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Paste a link to an image. Your initials are used until you add one.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={draft.name || profile.name} src={draft.image || null} size="xl" />
          <div className="flex-1 w-full">
            <Field
              label="Image URL"
              icon={ImageIcon}
              value={draft.image}
              onChange={set('image')}
              placeholder="https://…/avatar.png"
            />
          </div>
        </div>
      </section>

      <section className="surface rounded-2xl p-6 md:p-7">
        <h3 className="text-lg font-semibold text-foreground mb-5">Basic information</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Display name" icon={User} value={draft.name} onChange={set('name')} placeholder="Your name" />
          <Field
            label="Username"
            icon={AtSign}
            value={draft.username}
            onChange={set('username')}
            placeholder="yourhandle"
            hint="How teammates find you in the Inbox search. 3–32 characters."
          />
          <Field label="Job title" icon={Briefcase} value={draft.jobTitle} onChange={set('jobTitle')} placeholder="Backend Engineer" />
          <Field label="Department" icon={Briefcase} value={draft.department} onChange={set('department')} placeholder="Platform" />
          <Field label="Location" icon={MapPin} value={draft.location} onChange={set('location')} placeholder="Dhaka, Bangladesh" />
          <Field label="Phone" icon={Phone} value={draft.phoneNumber} onChange={set('phoneNumber')} placeholder="+880…" type="tel" />
        </div>

        <div className="mt-5">
          <Field
            label="Bio"
            icon={Sparkles}
            value={draft.bio}
            onChange={set('bio')}
            placeholder="A short introduction — what you work on and what you enjoy building."
            multiline
            maxLength={600}
            hint={`${draft.bio.length}/600`}
          />
        </div>

        <div className="mt-5">
          <Field
            label="Skills"
            icon={Sparkles}
            value={draft.skills}
            onChange={set('skills')}
            placeholder="React, PostgreSQL, Docker"
            hint="Comma separated."
          />
        </div>
      </section>

      <section className="surface rounded-2xl p-6 md:p-7">
        <h3 className="text-lg font-semibold text-foreground mb-5">Links</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="LinkedIn"
            icon={LinkedinIcon}
            value={draft.linkedinUrl}
            onChange={set('linkedinUrl')}
            placeholder="linkedin.com/in/yourname"
          />
          <Field
            label="GitHub username"
            icon={GithubIcon}
            value={draft.githubUsername}
            onChange={set('githubUsername')}
            placeholder="yourhandle"
          />
          <Field
            label="Website"
            icon={Globe}
            value={draft.websiteUrl}
            onChange={set('websiteUrl')}
            placeholder="yoursite.dev"
            hint="https:// is added for you if you leave it off."
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        <AnimatedButton
          variant="secondary"
          onClick={() => setDraft(draftFrom(profile))}
          disabled={!dirty || saving}
        >
          Reset
        </AnimatedButton>
        <AnimatedButton variant="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
          Save changes
        </AnimatedButton>
      </div>
    </motion.div>
  );
};
