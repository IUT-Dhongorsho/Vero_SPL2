import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { account } from "../models/user.model.js";
import { env } from "../config/env.js";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GMAIL_SCOPES = [
	"https://www.googleapis.com/auth/gmail.readonly",
	"https://www.googleapis.com/auth/gmail.send",
];

export class GmailNotConnectedError extends Error {
	constructor(readonly reason: "no-google-account" | "no-refresh-token" | "not-configured" | "refresh-failed") {
		super(reason);
	}
}

export function isGmailConfigured(): boolean {
	return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/**
 * Returns a usable Google access token for the user, refreshing it first when
 * it is expired or about to be.
 */
async function getAccessToken(userId: string): Promise<string> {
	if (!isGmailConfigured()) throw new GmailNotConnectedError("not-configured");

	const [googleAccount] = await db
		.select()
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "google")))
		.limit(1);

	if (!googleAccount) throw new GmailNotConnectedError("no-google-account");

	const expiresAt = googleAccount.accessTokenExpiresAt?.getTime() ?? 0;
	const stillValid = googleAccount.accessToken && expiresAt - Date.now() > 60_000;
	if (stillValid) return googleAccount.accessToken!;

	if (!googleAccount.refreshToken) throw new GmailNotConnectedError("no-refresh-token");

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID!,
			client_secret: env.GOOGLE_CLIENT_SECRET!,
			refresh_token: googleAccount.refreshToken,
			grant_type: "refresh_token",
		}),
	});

	if (!response.ok) {
		console.error("[gmail] token refresh failed", await response.text());
		throw new GmailNotConnectedError("refresh-failed");
	}

	const payload = (await response.json()) as { access_token: string; expires_in: number };
	await db
		.update(account)
		.set({
			accessToken: payload.access_token,
			accessTokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000),
			updatedAt: new Date(),
		})
		.where(eq(account.id, googleAccount.id));

	return payload.access_token;
}

async function gmailFetch(userId: string, path: string, init?: RequestInit) {
	const token = await getAccessToken(userId);
	const response = await fetch(`${GMAIL_API}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		const body = await response.text();
		const error = new Error(`Gmail API ${response.status}: ${body}`);
		(error as any).status = response.status;
		throw error;
	}
	return response.json() as Promise<any>;
}

export interface MailSummary {
	id: string;
	threadId: string;
	from: string;
	fromEmail: string;
	subject: string;
	snippet: string;
	date: string;
	unread: boolean;
	starred: boolean;
	hasAttachment: boolean;
	webUrl: string;
}

function header(headers: { name: string; value: string }[], name: string): string {
	return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function splitAddress(raw: string): { name: string; email: string } {
	const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
	if (match) return { name: match[1].trim() || match[2], email: match[2].trim() };
	return { name: raw.trim(), email: raw.trim() };
}

/** Most recent inbox messages, newest first. */
export async function listRecentInbox(userId: string, max = 5): Promise<MailSummary[]> {
	const list = await gmailFetch(
		userId,
		`/messages?maxResults=${max}&labelIds=INBOX&q=${encodeURIComponent("-in:chats")}`
	);

	const ids: { id: string }[] = list.messages ?? [];
	const details = await Promise.all(
		ids.map((m) =>
			gmailFetch(
				userId,
				`/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To`
			)
		)
	);

	return details.map((msg): MailSummary => {
		const headers = msg.payload?.headers ?? [];
		const { name, email } = splitAddress(header(headers, "From"));
		const labels: string[] = msg.labelIds ?? [];
		return {
			id: msg.id,
			threadId: msg.threadId,
			from: name,
			fromEmail: email,
			subject: header(headers, "Subject") || "(no subject)",
			snippet: decodeEntities(msg.snippet ?? ""),
			date: new Date(Number(msg.internalDate)).toISOString(),
			unread: labels.includes("UNREAD"),
			starred: labels.includes("STARRED"),
			hasAttachment: Boolean(msg.payload?.parts?.some((p: any) => p.filename)),
			webUrl: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
		};
	});
}

function decodeEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");
}

/** Full plain-text body for the reader pane. */
export async function getMessage(userId: string, messageId: string) {
	const msg = await gmailFetch(userId, `/messages/${messageId}?format=full`);
	const headers = msg.payload?.headers ?? [];
	const { name, email } = splitAddress(header(headers, "From"));

	return {
		id: msg.id,
		threadId: msg.threadId,
		from: name,
		fromEmail: email,
		to: header(headers, "To"),
		subject: header(headers, "Subject") || "(no subject)",
		date: new Date(Number(msg.internalDate)).toISOString(),
		body: extractPlainText(msg.payload) || decodeEntities(msg.snippet ?? ""),
		messageIdHeader: header(headers, "Message-ID"),
		referencesHeader: header(headers, "References"),
		webUrl: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
	};
}

function extractPlainText(payload: any): string {
	if (!payload) return "";
	if (payload.mimeType === "text/plain" && payload.body?.data) {
		return Buffer.from(payload.body.data, "base64url").toString("utf8");
	}
	for (const part of payload.parts ?? []) {
		const found = extractPlainText(part);
		if (found) return found;
	}
	if (payload.mimeType === "text/html" && payload.body?.data) {
		return Buffer.from(payload.body.data, "base64url")
			.toString("utf8")
			.replace(/<style[\s\S]*?<\/style>/gi, "")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s{2,}/g, " ")
			.trim();
	}
	return "";
}

export interface ReplyInput {
	messageId: string;
	body: string;
}

/** Sends a reply on the same Gmail thread as the message being answered. */
export async function replyToMessage(userId: string, { messageId, body }: ReplyInput) {
	const original = await getMessage(userId, messageId);

	const subject = original.subject.toLowerCase().startsWith("re:")
		? original.subject
		: `Re: ${original.subject}`;

	const references = [original.referencesHeader, original.messageIdHeader].filter(Boolean).join(" ");

	const mime = [
		`To: ${original.fromEmail}`,
		`Subject: ${subject}`,
		original.messageIdHeader ? `In-Reply-To: ${original.messageIdHeader}` : "",
		references ? `References: ${references}` : "",
		"Content-Type: text/plain; charset=UTF-8",
		"MIME-Version: 1.0",
		"",
		body,
	]
		.filter(Boolean)
		.join("\r\n");

	return gmailFetch(userId, "/messages/send", {
		method: "POST",
		body: JSON.stringify({
			raw: Buffer.from(mime, "utf8").toString("base64url"),
			threadId: original.threadId,
		}),
	});
}

/** Whether this user can currently read mail, and why not if they can't. */
export async function getConnectionStatus(userId: string) {
	if (!isGmailConfigured()) {
		return {
			connected: false,
			reason: "not-configured" as const,
			message: "Gmail is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
		};
	}

	const [googleAccount] = await db
		.select({ id: account.id, refreshToken: account.refreshToken, scope: account.scope })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "google")))
		.limit(1);

	if (!googleAccount) {
		return {
			connected: false,
			reason: "no-google-account" as const,
			message: "Sign in with Google to see your inbox here.",
		};
	}

	const grantedScopes = googleAccount.scope?.split(/[\s,]+/) ?? [];
	const missing = GMAIL_SCOPES.filter((s) => !grantedScopes.includes(s));
	if (missing.length > 0) {
		return {
			connected: false,
			reason: "missing-scope" as const,
			message: "Reconnect Google to grant Gmail access.",
			missingScopes: missing,
		};
	}

	return { connected: true as const, reason: null, message: null };
}
