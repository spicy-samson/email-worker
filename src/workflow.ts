import {
	WorkflowEntrypoint,
	WorkflowEvent,
	WorkflowStep,
} from "cloudflare:workers";
import { GOOD_MORNING_HTML } from "./templates/good-morning";

const DEFAULT_SUBJECT = "Good Morning";

export type EmailParams = {
	to: string;
	/** Optional; defaults to "Good Morning" and good-morning HTML template */
	subject?: string;
	html?: string;
	/** Optional; defaults to env.RESEND_FROM */
	from?: string;
	/** Optional; BCC these addresses (or set RESEND_BCC in env to always get a copy) */
	bcc?: string | string[];
};

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toBccList(bcc: string | string[] | undefined): string[] {
	if (bcc == null) return [];
	const arr = Array.isArray(bcc) ? bcc : [bcc];
	return arr.map((e) => e.trim()).filter(Boolean);
}

export class EmailWorkflow extends WorkflowEntrypoint<Env, EmailParams> {
	async run(event: WorkflowEvent<EmailParams>, step: WorkflowStep) {
		const { to, subject, html, from, bcc } = event.payload;

		// Step 1: Validate and persist input (replay-safe)
		const validated = await step.do("validate-email", async () => {
			if (!to?.trim()) throw new Error("Missing 'to' email");
			if (!isValidEmail(to)) throw new Error(`Invalid email: ${to}`);
			const subj = (subject?.trim() || DEFAULT_SUBJECT).trim();
			const body = html?.trim() || GOOD_MORNING_HTML;
			const bccList = toBccList(bcc);
			for (const e of bccList) if (!isValidEmail(e)) throw new Error(`Invalid bcc email: ${e}`);
			return { to: to.trim(), subject: subj, html: body, bcc: bccList };
		});

		// Step 2: Send via Resend (retryable step)
		const result = await step.do("send-via-resend", async () => {
			const apiKey = this.env.RESEND_API_KEY;
			const fromAddress = from?.trim() || this.env.RESEND_FROM;
			if (!apiKey) throw new Error("RESEND_API_KEY is not set");
			if (!fromAddress) throw new Error("RESEND_FROM is not set (or pass 'from' in params)");

			const bccList = [
				...validated.bcc,
				...(this.env.RESEND_BCC?.trim() ? [this.env.RESEND_BCC.trim()] : []),
			];
			const payload: Record<string, unknown> = {
				from: fromAddress,
				to: validated.to,
				subject: validated.subject,
				html: validated.html,
			};
			if (bccList.length > 0) payload.bcc = [...new Set(bccList)];

			const res = await fetch("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const err = await res.text();
				throw new Error(`Resend API error ${res.status}: ${err}`);
			}

			const data = (await res.json()) as { id?: string };
			return { id: data.id, to: validated.to };
		});

		return result;
	}
}
