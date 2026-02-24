/**
 * Email sending workflow (Resend).
 *
 * - POST / with JSON body: { "to" (required), "subject?", "html?", "from?", "bcc?" }
 * - Omit subject/html to use the default "Good Morning" template.
 * - Set RESEND_BCC in .dev.vars or secrets to always BCC yourself (see template sent).
 */
export { EmailWorkflow } from "./workflow";

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		if (req.method !== "POST" || new URL(req.url).pathname !== "/") {
			return new Response(
				JSON.stringify({
					error: "POST / with JSON body: { to (, subject?, html?, from?, bcc? ) }",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		let body: {
			to?: string;
			subject?: string;
			html?: string;
			from?: string;
			bcc?: string | string[];
		};
		try {
			body = (await req.json()) as typeof body;
		} catch {
			return new Response(
				JSON.stringify({ error: "Invalid JSON body" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		const instance = await env.MY_WORKFLOW.create({
			params: {
				to: body.to ?? "",
				subject: body.subject,
				html: body.html,
				from: body.from,
				bcc: body.bcc,
			},
		});

		return new Response(
			JSON.stringify({ workflowId: instance.id }),
			{ status: 202, headers: { "Content-Type": "application/json" } }
		);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const instance = await env.MY_WORKFLOW.create({
			params: {
				to: env.RECIPIENT_EMAIL, // Ensure you have this in .dev.vars or secrets
			},
		});
		console.log(`Cron workflow triggered: ${instance.id}`);
	},
};
