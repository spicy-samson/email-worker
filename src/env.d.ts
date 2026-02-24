declare namespace Cloudflare {
	interface Env {
		RESEND_API_KEY?: string;
		RESEND_FROM?: string;
		/** Optional; BCC this address on every send (e.g. your email to see the template) */
		RESEND_BCC?: string;
	}
}
