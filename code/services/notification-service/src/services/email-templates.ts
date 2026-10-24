import { env } from '../config/env.js';

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Absolute link into the app for a notification's resourceUrl. */
export function appLink(path?: string | null) {
  if (!path) return env.FRONTEND_URL;
  if (/^https?:\/\//.test(path)) return path;
  return `${env.FRONTEND_URL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * One plain, table-based layout for every Vero email. Mail clients ignore most
 * CSS, so styles are inline and the palette matches the app's monochrome UI.
 */
export function layout(options: { preheader: string; heading: string; body: string; action?: { label: string; url: string }; footnote?: string }) {
  const { preheader, heading, body, action, footnote } = options;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a">
<span style="display:none;max-height:0;overflow:hidden">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td style="padding:0 4px 20px">
      <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:10px;background:#0a0a0a;color:#fff;font-weight:700;font-size:15px">V</span>
      <span style="font-weight:600;font-size:16px;vertical-align:middle;margin-left:8px">Vero</span>
    </td></tr>
    <tr><td style="background:#fff;border:1px solid #e6e6e6;border-radius:16px;padding:32px">
      <h1 style="margin:0 0 12px;font-size:21px;line-height:1.3;font-weight:650;letter-spacing:-0.01em">${escape(heading)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#3f3f46">${body}</div>
      ${
        action
          ? `<p style="margin:28px 0 8px"><a href="${escape(action.url)}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:12px">${escape(action.label)}</a></p>
      <p style="margin:16px 0 0;font-size:12px;color:#8a8a8a;word-break:break-all">Or paste this link into your browser:<br>${escape(action.url)}</p>`
          : ''
      }
    </td></tr>
    <tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:#8a8a8a">${footnote ? escape(footnote) : 'You are receiving this because you have a Vero account.'}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export function passwordResetEmail(name: string, url: string) {
  return {
    subject: 'Reset your Vero password',
    html: layout({
      preheader: 'Use this link within the next hour to choose a new password.',
      heading: 'Reset your password',
      body: `<p style="margin:0">Hi ${escape(name || 'there')},</p>
<p style="margin:12px 0 0">Someone asked to reset the password for your Vero account. If that was you, choose a new password below. The link works once and expires in one hour.</p>`,
      action: { label: 'Choose a new password', url },
      footnote: 'If you did not ask for this, you can ignore this email — your password stays the same.',
    }),
  };
}

/** Email copy for an in-app notification. */
export function notificationEmail(title: string, body: string | null | undefined, resourceUrl?: string | null) {
  return {
    subject: title,
    html: layout({
      preheader: body || title,
      heading: title,
      body: body ? `<p style="margin:0">${escape(body)}</p>` : '',
      action: { label: 'Open in Vero', url: appLink(resourceUrl) },
      footnote: 'You can turn these emails off in Vero under Settings → Notifications.',
    }),
  };
}
